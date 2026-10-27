"""Trusted grader and isolated learner interpreter. Only JSON crosses their socket.
Never execute learner code in the grader, unpickle its objects, or accept its verdict.
"""
import ast
import builtins
import contextlib
import ctypes
import datetime
import importlib
import io
import json
import os
import platform
import signal
import socket
import struct
import sys
import traceback
import types

MAX_MESSAGE = 4 * 1024 * 1024


class LimitedOutput(io.StringIO):
    def write(self, value):
        if self.tell() + len(value) > 100_000:
            raise RuntimeError("Çıxış 100 000 simvol limitini keçdi")
        return super().write(value)


def send(connection, value):
    encoded = json.dumps(value, ensure_ascii=False, allow_nan=False).encode()
    if len(encoded) > MAX_MESSAGE:
        raise RuntimeError("Yoxlama məlumatı ölçü limitini keçdi")
    connection.sendall(struct.pack("!I", len(encoded)) + encoded)


def receive(connection):
    def read(size):
        chunks = bytearray()
        while len(chunks) < size:
            part = connection.recv(size - len(chunks))
            if not part:
                raise RuntimeError("Python prosesi nəticə vermədən dayandırıldı")
            chunks.extend(part)
        return chunks
    size = struct.unpack("!I", read(4))[0]
    if size > MAX_MESSAGE:
        raise RuntimeError("Yoxlama məlumatı ölçü limitini keçdi")
    return json.loads(read(size))


def restrict_worker():
    # The child cannot fork/exec, steal descriptors, or signal/attach to the
    # grader. The pre-opened socket is its only result channel. No /proc mount.
    machines = {
        "x86_64": (0xC000003E, 56, [57, 58, 59, 62, 101, 200, 234, 129, 297, 310, 311, 322, 434, 424, 438, 41, 298, 272, 308, 165]),
        "aarch64": (0xC00000B7, 220, [221, 129, 130, 131, 117, 138, 240, 270, 271, 281, 434, 424, 438, 198, 241, 97, 268, 40]),
    }
    arch, clone_number, denied = machines[platform.machine()]
    class Filter(ctypes.Structure):
        _fields_ = [("code", ctypes.c_ushort), ("jt", ctypes.c_ubyte), ("jf", ctypes.c_ubyte), ("k", ctypes.c_uint)]
    class Program(ctypes.Structure):
        _fields_ = [("len", ctypes.c_ushort), ("filter", ctypes.POINTER(Filter))]
    instructions = [(0x20, 0, 0, 4), (0x15, 1, 0, arch), (0x06, 0, 0, 0x80000000), (0x20, 0, 0, 0)]
    instructions += [(0x35, 0, 1, 0x40000000), (0x06, 0, 0, 0x00050001)]
    # glibc falls back from clone3 to clone on ENOSYS. Only CLONE_THREAD
    # is allowed: scientific packages need threads, never extra processes.
    instructions += [(0x15, 0, 1, 435), (0x06, 0, 0, 0x00050026)]
    instructions += [(0x15, 0, 4, clone_number), (0x20, 0, 0, 16),
                     (0x45, 1, 0, 0x10000), (0x06, 0, 0, 0x00050001),
                     (0x06, 0, 0, 0x7FFF0000)]
    for number in denied:
        instructions += [(0x15, 0, 1, number), (0x06, 0, 0, 0x00050001)]
    instructions += [(0x06, 0, 0, 0x7FFF0000)]
    filters = (Filter * len(instructions))(*(Filter(*x) for x in instructions))
    program = Program(len(filters), filters)
    libc = ctypes.CDLL(None, use_errno=True)
    if libc.prctl(38, 1, 0, 0, 0) or libc.prctl(22, 2, ctypes.byref(program), 0, 0):
        raise RuntimeError("Python təhlükəsizlik filtri başladıla bilmədi")


def child_main(connection, payload):
    output = LimitedOutput()
    class EchoInput(io.StringIO):
        def readline(self, *args):
            value = super().readline(*args)
            output.write(value)
            return value
    raw = payload.get("stdin", "").replace("\r", "")
    sys.stdin = EchoInput(raw.removesuffix("\n") + "\n" if raw.strip() else "")
    sys.stdout = sys.stderr = sys.__stdout__ = sys.__stderr__ = output
    for descriptor in (0, 1, 2):
        os.close(descriptor)
    restrict_worker()
    # Only the learner interpreter imports files it creates in /work.
    sys.path.insert(0, '/work')
    objects = {}

    def encode(value, depth=0):
        if depth > 20:
            raise RuntimeError("Nəticə çox dərindir")
        if value is None or type(value) in (str, bool, int):
            return {"kind": "value", "value": value}
        if type(value) is float:
            return {"kind": "float", "value": str(value)}
        if type(value) is bytes:
            return {"kind": "bytes", "value": value.hex()}
        if type(value) in (list, tuple, set, frozenset):
            return {"kind": type(value).__name__, "values": [encode(x, depth + 1) for x in value]}
        if type(value) is dict:
            return {"kind": "dict", "values": [[encode(k, depth + 1), encode(v, depth + 1)] for k, v in value.items()]}
        module = type(value).__module__
        if module.startswith("numpy"):
            import numpy as np
            if isinstance(value, np.dtype):
                return {"kind": "dtype", "value": str(value)}
            if isinstance(value, np.ndarray):
                return {"kind": "array", "values": encode(value.tolist(), depth + 1), "dtype": str(value.dtype)}
            if isinstance(value, np.generic):
                return encode(value.item(), depth + 1)
        if module.startswith("pandas"):
            import pandas as pd
            if value is pd.NA or value is pd.NaT:
                return {"kind": "missing", "type": "NA" if value is pd.NA else "NaT"}
            if isinstance(value, pd.DataFrame):
                return {"kind": "frame", "values": encode(value.to_numpy().tolist(), depth + 1), "index": encode(value.index, depth + 1), "columns": encode(value.columns, depth + 1), "dtypes": [str(x) for x in value.dtypes]}
            if isinstance(value, pd.Series):
                return {"kind": "series", "values": encode(value.tolist(), depth + 1), "index": encode(value.index, depth + 1), "name": encode(value.name, depth + 1), "dtype": str(value.dtype)}
            if isinstance(value, pd.Index):
                return {"kind": "index", "values": encode(value.tolist(), depth + 1), "names": encode(list(value.names), depth + 1), "multi": isinstance(value, pd.MultiIndex)}
        if isinstance(value, (datetime.datetime, datetime.date, datetime.time)):
            return {"kind": "date", "type": type(value).__name__, "value": value.isoformat()}
        identifier = str(id(value))
        objects[identifier] = value
        descriptor = {"kind": "remote", "id": identifier, "module": module, "type": type(value).__qualname__}
        if isinstance(value, types.ModuleType) and str(getattr(value, '__file__', '')).startswith('/work/'):
            descriptor['localModule'] = value.__name__
        return descriptor

    def decode(value):
        if isinstance(value, dict) and 'slice' in value:
            return slice(*value['slice'])
        if isinstance(value, dict) and "remote" in value:
            return objects[value["remote"]]
        if isinstance(value, list):
            return [decode(x) for x in value]
        if isinstance(value, dict):
            return {k: decode(v) for k, v in value.items()}
        return value

    try:
        namespace = {"__name__": "__main__", "display": lambda *items: print(*(repr(x) for x in items))}
        tree = ast.parse(payload["code"], filename="<exec>")
        last = ast.Expression(tree.body.pop().value) if tree.body and isinstance(tree.body[-1], ast.Expr) else None
        exec(compile(tree, "<exec>", "exec"), namespace)
        if last:
            value = eval(compile(last, "<exec>", "eval"), namespace)
            if value is not None and type(value).__module__.split(".")[0] not in {"matplotlib", "seaborn", "plotly"}:
                print(repr(value))
        plots = {name: encode(sys.modules[name]) for name in ('matplotlib', 'matplotlib.pyplot') if name in sys.modules}
        send(connection, {"namespace": {k: encode(v) for k, v in namespace.items() if k != "__builtins__"}, "plotModules": plots, "stdout": output.getvalue()[:10000]})
        while True:
            request = receive(connection)
            try:
                value = objects[request["id"]]
                operation = request["operation"]
                if operation == "attr": value = getattr(value, request["name"])
                elif operation == "call": value = value(*decode(request["args"]), **decode(request["kwargs"]))
                elif operation == "item": value = value[decode(request["key"])]
                elif operation == "len": value = len(value)
                elif operation == "bool": value = bool(value)
                elif operation == "iter": value = list(value)
                elif operation == "repr": value = repr(value)
                else: raise RuntimeError("Unknown operation")
                send(connection, {"value": encode(value)})
            except BaseException as error:
                send(connection, {"error": str(error)[:2000], "errorType": type(error).__name__})
    except BaseException as error:
        try:
            send(connection, {"error": "".join(traceback.format_exception_only(type(error), error)).strip()[:2000], "stdout": output.getvalue()[:10000]})
        except BaseException:
            pass


def grade(connection, payload):
    def encode_arg(value):
        if isinstance(value, RemoteValue): return {"remote": value._id}
        if isinstance(value, slice): return {'slice': [value.start, value.stop, value.step]}
        if isinstance(value, (list, tuple)): return [encode_arg(x) for x in value]
        if isinstance(value, dict): return {k: encode_arg(v) for k, v in value.items()}
        return value

    class RemoteValue:
        def __init__(self, descriptor):
            self._id, self._module, self._type = descriptor["id"], descriptor["module"], descriptor["type"]
            self._local_module = descriptor.get('localModule')
        def operation(self, operation_name, **kwargs):
            send(connection, {"id": self._id, "operation": operation_name, **kwargs})
            response = receive(connection)
            if "error" in response:
                error_type = {'AttributeError': AttributeError, 'TypeError': TypeError, 'ValueError': ValueError, 'KeyError': KeyError, 'IndexError': IndexError}.get(response.get('errorType'), RuntimeError)
                raise error_type(response["error"])
            return decode(response["value"])
        @property
        def __class__(self):
            roots = {"numpy", "pandas", "matplotlib", "seaborn", "sklearn", "scipy", "sqlite3", "datetime", "decimal", "email", "collections", "builtins", "statsmodels", "wordcloud", "plotly"}
            if self._module.split(".")[0] in roots:
                try:
                    value = importlib.import_module(self._module)
                    for part in self._type.split("."):
                        if part.startswith("_"): return RemoteValue
                        value = getattr(value, part)
                    if isinstance(value, type): return value
                except (ImportError, AttributeError): pass
            return RemoteValue
        def __getattr__(self, name):
            if name in {'__array_struct__', '__array_interface__', '__array__'}: raise AttributeError(name)
            return self.operation("attr", name=name)
        def __call__(self, *args, **kwargs): return self.operation("call", args=encode_arg(args), kwargs=encode_arg(kwargs))
        def __getitem__(self, key): return self.operation("item", key=encode_arg(key))
        def __len__(self): return self.operation("len")
        def __bool__(self): return self.operation("bool")
        def __iter__(self): return iter(self.operation("iter"))
        def __repr__(self): return self.operation("repr")

    def decode(value):
        kind = value["kind"]
        if kind == "value": return value["value"]
        if kind == "float": return float(value["value"])
        if kind == "bytes": return bytes.fromhex(value["value"])
        if kind in {"list", "tuple", "set", "frozenset"}:
            return {"list": list, "tuple": tuple, "set": set, "frozenset": frozenset}[kind](decode(x) for x in value["values"])
        if kind == "dict": return {decode(k): decode(v) for k, v in value["values"]}
        if kind == "array":
            import numpy as np
            return np.array(decode(value["values"]), dtype=value["dtype"])
        if kind == "dtype":
            import numpy as np
            return np.dtype(value['value'])
        if kind in {"frame", "series", "index", "missing"}:
            import pandas as pd
            if kind == "missing": return pd.NA if value["type"] == "NA" else pd.NaT
            if kind == "index":
                values, names = decode(value["values"]), decode(value["names"])
                return pd.MultiIndex.from_tuples(values, names=names) if value["multi"] else pd.Index(values, name=names[0])
            if kind == "series": return pd.Series(decode(value["values"]), index=decode(value["index"]), name=decode(value["name"]), dtype=value["dtype"])
            frame = pd.DataFrame(decode(value["values"]), index=decode(value["index"]), columns=decode(value["columns"]))
            for index, dtype in enumerate(value["dtypes"]): frame.isetitem(index, frame.iloc[:, index].astype(dtype))
            return frame
        if kind == "date":
            date_type = {"datetime": datetime.datetime, "Timestamp": datetime.datetime, "date": datetime.date, "time": datetime.time}[value["type"]]
            return date_type.fromisoformat(value["value"])
        if kind == "remote": return RemoteValue(value)
        raise RuntimeError("Python nəticəsi tanınmadı")

    result = {"passed": False, "stdout": "", "error": None}
    try:
        response = receive(connection)
        result["stdout"] = response.get("stdout", "")[:10000]
        if "error" in response: raise RuntimeError(response["error"])
        namespace = {k: decode(v) for k, v in response["namespace"].items() if k not in vars(builtins)}
        package_roots = {'numpy', 'pandas', 'matplotlib', 'seaborn', 'scipy', 'sklearn', 'plotly', 'statsmodels', 'wordcloud'}
        local_modules = {v._local_module: v for v in namespace.values() if type(v) is RemoteValue and v._local_module and v._local_module.split('.')[0] not in sys.stdlib_module_names | package_roots}
        plot_modules = {k: decode(v) for k, v in response.get('plotModules', {}).items()}
        def safe_import(name, globals=None, locals=None, fromlist=(), level=0):
            if not level and name in local_modules:
                return local_modules[name]
            if not level and name in plot_modules:
                return plot_modules[name if fromlist else name.split('.')[0]]
            return builtins.__import__(name, globals, locals, fromlist, level)
        namespace['__builtins__'] = {**vars(builtins), '__import__': safe_import}
        namespace["dacy"] = types.SimpleNamespace(stdout=result["stdout"], lines=[x.strip() for x in result["stdout"].splitlines() if x.strip()], code=payload["code"])
        if not payload.get("tests", "").strip():
            raise RuntimeError("Tapşırığın server yoxlaması hazırlanmayıb. Müəllimə bildirin.")
        with contextlib.redirect_stdout(LimitedOutput()), contextlib.redirect_stderr(LimitedOutput()):
            exec(compile(payload["tests"], "<tests>", "exec"), namespace)
        result["passed"] = True
    except BaseException as error:
        result["error"] = "".join(traceback.format_exception_only(type(error), error)).strip()[:2000]
    return result


payload = json.loads(sys.stdin.read(256_000))
libc = ctypes.CDLL(None, use_errno=True)
if libc.prctl(4, 0, 0, 0, 0):
    raise RuntimeError("Python yoxlaması qoruna bilmədi")
parent, child = socket.socketpair()
pid = os.fork()
if pid == 0:
    parent.close()
    try: child_main(child, payload)
    finally: os._exit(0)
child.close()
try:
    result = grade(parent, payload)
finally:
    parent.close()
    try: os.kill(pid, signal.SIGKILL)
    except ProcessLookupError: pass
    os.waitpid(pid, 0)
sys.stdout.write(json.dumps(result, ensure_ascii=False))

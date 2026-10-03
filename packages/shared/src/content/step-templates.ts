import type { StepType } from '../enums';
import type { StepDefinitionDraft } from './step-definition';
import { emptyDefinition } from './step-config';

/**
 * «Nümunə ilə yarat»: yeni addım boş yox, işlək nümunə məzmunla açılır — müəllim yalnız dəyişdirir.
 * SQL nümunəsi datasetsiz işləyir (VALUES), Python testləri birbaşa keçir, CTF-in bir sualı var.
 * Terminal üçün yoxlama skripti fayl olduğundan boş qalır (redaktor bunu göstərir).
 */
export function templateDefinition(type: StepType, title: string): StepDefinitionDraft {
  const d = emptyDefinition(type, title);
  switch (d.type) {
    case 'theory':
      return {
        ...d,
        content: [
          `# ${title}`,
          '',
          'Bu dərsdə nə öyrənəcəyik — 1–2 cümlə ilə yazın.',
          '',
          '## Əsas anlayış',
          '',
          'İzahı burada verin. **Qalın**, *kursiv* və `kod` istifadə edə bilərsiniz.',
          '',
          '```sql',
          'SELECT ad, soyad FROM telebeler;',
          '```',
          '',
          '> Məsləhət: hər bölmədən sonra qısa nümunə göstərin.',
          '',
          '## Xülasə',
          '',
          '- Birinci əsas fikir',
          '- İkinci əsas fikir',
        ].join('\n'),
      };
    case 'quiz':
      return {
        ...d,
        questions: [
          {
            text: 'Sualın mətnini yazın — hansı variant düzgündür?',
            type: 'single',
            options: ['Düzgün variant', 'Səhv variant', 'Başqa səhv variant'],
            correct: [0],
            explanation: 'Cavabdan sonra tələbəyə göstərilən izah.',
          },
        ],
      };
    case 'sql':
      return {
        ...d,
        instructions: [
          'Hər şəhər üçün əhalini göstərən sorğu yazın, ən böyük şəhər birinci olsun.',
          '',
          '> Nümunə datasetsiz işləyir. Öz datasetinizi «Fayllar» bölməsindən yükləyib aşağıda seçin.',
        ].join('\n'),
        starter_code: '-- Sorğunuzu bura yazın\nSELECT ',
        solution: [
          'SELECT seher, ehali',
          "FROM (VALUES ('Bakı', 2300000), ('Gəncə', 335000), ('Sumqayıt', 345000)) AS t(seher, ehali)",
          'ORDER BY ehali DESC;',
        ].join('\n'),
        hints: ['ORDER BY ... DESC azalan sıra verir'],
        tasks: ['Şəhər və əhali sütunlarını seçin', 'Əhaliyə görə azalan sırala'],
      };
    case 'python':
      return {
        ...d,
        instructions: 'İki ədədin cəmini qaytaran `cem(a, b)` funksiyası yazın.',
        starter_code: 'def cem(a, b):\n    # kodunuzu bura yazın\n    pass\n',
        solution: 'def cem(a, b):\n    return a + b\n',
        tests: [
          "assert 'cem' in globals(), 'cem funksiyası tapılmadı'",
          "assert cem(2, 3) == 5, 'cem(2, 3) 5 olmalıdır'",
          "assert cem(-1, 1) == 0, 'mənfi ədədlərlə də işləməlidir'",
        ].join('\n'),
        hints: ['return açar sözü ilə nəticəni qaytarın'],
        tasks: ['cem funksiyasını yazın', 'Testləri keçin'],
      };
    case 'terminal':
      return {
        ...d,
        instructions: [
          'Ev qovluğunda `hesabat` adlı qovluq yaradın və içində `qeyd.txt` faylı olsun.',
          '',
          '```sh',
          'mkdir ~/hesabat',
          'touch ~/hesabat/qeyd.txt',
          '```',
          '',
          'Bitirəndə «Yoxla» düyməsinə basın.',
        ].join('\n'),
        docker_image: 'dacy/numune-lab:latest',
        // yoxlama skripti kursun fayllarındandır — müəllim yükləyib seçir (boş sətir draft-da keçmir)
        check_script: undefined,
        tasks: ['~/hesabat qovluğunu yaradın', 'qeyd.txt faylını əlavə edin'],
        hints: ['mkdir qovluq, touch boş fayl yaradır'],
      };
    case 'ctf':
      return {
        ...d,
        instructions: 'Otağın ssenarisini yazın: tələbə nəyi araşdırır, hansı fayllar verilir.',
        tasks: [
          {
            key: 'bayraq-1',
            question: 'Gizlənmiş bayrağı tapın (format: DACY{...})',
            answer: 'DACY{numune}',
            hint: 'Faylın sonuna baxın',
            points: 50,
            case_sensitive: false,
          },
        ],
      };
  }
}

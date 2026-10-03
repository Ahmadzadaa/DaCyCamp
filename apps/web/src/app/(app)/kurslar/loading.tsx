import { CourseCardSkeleton } from '@/components/app/course-card';

export default function Loading() {
  return (
    <div aria-busy="true">
      <div className="sk h-[260px] !rounded-[24px]" />
      <div className="mt-8 flex flex-wrap gap-2">
        {[84, 140, 160, 150, 104, 70, 48].map((w, i) => (
          <div key={i} className="sk h-[38px] !rounded-[10px]" style={{ width: w }} />
        ))}
      </div>
      <div className="mb-6 mt-4 flex items-center gap-3">
        <div className="sk h-5 w-16" />
        <div className="sk ml-auto h-10 w-64 !rounded-[12px]" />
        <div className="sk h-10 w-24 !rounded-[12px]" />
        <div className="sk h-10 w-36 !rounded-[10px]" />
      </div>
      <div className="cards">
        {Array.from({ length: 6 }).map((_, i) => (
          <CourseCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

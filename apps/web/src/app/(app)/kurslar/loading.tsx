import { CourseCardSkeleton } from '@/components/app/course-card';

export default function Loading() {
  return (
    <div>
      <div className="sk h-[120px] !rounded-[14px]" />
      <div className="my-5 flex gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="sk h-9 w-28 !rounded-full" />
        ))}
      </div>
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(230px,1fr))]">
        {Array.from({ length: 4 }).map((_, i) => (
          <CourseCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

/**
 * Müvəqqəti gizlədilən tələbə bölmələri (istifadəçinin qərarı, 3 oktyabr 2026: «hələlik olmasın, sonra baxarıq»).
 * true etsən bölmə menyulara (sidebar, header, mobil alt menyu, tanışlıq səhifəsi) və marşruta qayıdır.
 * Səhifələr və API olduğu kimi qalır; söndürüləndə URL kataloqa yönləndirilir.
 */
export const FEATURES = {
  /** «Layihələr» — /layiheler */
  projects: false,
  /** «Yarışlar» — /yarislar */
  contests: false,
} as const;

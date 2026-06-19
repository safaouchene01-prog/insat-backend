export const DoctorCardSkeleton = () => (
  <div className="animate-pulse rounded-[2rem] bg-white p-6 shadow-sm border border-gray-100">
    <div className="flex items-start gap-4 mb-4">
      <div className="w-16 h-16 rounded-full bg-gray-200 flex-shrink-0" />
      <div className="w-full">
        <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
        <div className="h-4 bg-gray-100 rounded w-1/2" />
      </div>
    </div>
    <div className="space-y-3 mb-6">
      <div className="h-4 bg-gray-100 rounded w-2/3" />
      <div className="h-4 bg-gray-100 rounded w-1/2" />
    </div>
    <div className="h-12 bg-gray-200 rounded-xl w-full" />
  </div>
);

export const ClinicCardSkeleton = () => (
  <div className="animate-pulse rounded-[2rem] bg-white p-6 shadow-sm border border-gray-100">
    <div className="flex items-start gap-4 mb-4">
      <div className="w-16 h-16 rounded-full bg-gray-200 flex-shrink-0" />
      <div className="w-full">
        <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
        <div className="h-4 bg-gray-100 rounded w-1/2" />
      </div>
    </div>
    <div className="space-y-3 mb-6">
      <div className="h-4 bg-gray-100 rounded w-2/3" />
      <div className="h-4 bg-gray-100 rounded w-1/2" />
    </div>
    <div className="h-12 bg-gray-200 rounded-xl w-full" />
  </div>
);

export const AppointmentRowSkeleton = () => (
  <div className="animate-pulse flex gap-4 p-4 rounded-xl bg-white border border-gray-100">
    <div className="w-12 h-12 rounded-full bg-gray-200 flex-shrink-0" />
    <div className="flex-1 space-y-2">
      <div className="h-4 bg-gray-200 rounded w-1/3" />
      <div className="h-3 bg-gray-100 rounded w-1/2" />
    </div>
    <div className="w-20 h-8 bg-gray-200 rounded-lg" />
  </div>
);

import { Skeleton } from "../../../components/ui/Skeleton";

export const LoadingState = () => (
  <div className="space-y-4 p-4">
    <Skeleton className="h-64 w-full" />
    <Skeleton className="h-32 w-2/3" />
    <Skeleton className="h-48 w-full" />
  </div>
);
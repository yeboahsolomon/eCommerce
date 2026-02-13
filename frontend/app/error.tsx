'use client'; // Error components must be Client Components

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Global Error Caught:", error);
    if(error.stack) console.error(error.stack);
  }, [error]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <h2 className="mb-2 text-2xl font-bold text-slate-900">Something went wrong!</h2>
      <p className="mb-6 max-w-md text-slate-500">
        We apologize for the inconvenience. An unexpected error has occurred.
      </p>
      <button
        onClick={
          // Attempt to recover by trying to re-render the segment
          () => reset()
        }
        className="rounded-full bg-blue-600 px-6 py-2.5 font-bold text-white transition hover:bg-blue-700 active:scale-95 shadow-md"
      >
        Try again
      </button>
    </div>
  );
}

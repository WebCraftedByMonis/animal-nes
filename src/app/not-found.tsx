// app/not-found.tsx
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900 text-center px-4">
      <div>
        <h1 className="text-6xl font-bold text-green-600 dark:text-green-400">
          Page Not Found
        </h1>
        <p className="my-10 text-xl text-gray-700 dark:text-gray-300">
          The page you are looking for does not exist!
        </p>
        <Link
          href="/"
          className="inline-block text-blue-500 hover:underline dark:text-blue-400"
        >
          Go back home
        </Link>
      </div>
    </div>
  );
}

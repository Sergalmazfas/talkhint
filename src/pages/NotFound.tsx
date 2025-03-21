
import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { AlertCircle } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-lg text-center">
        <div className="flex justify-center mb-4">
          <AlertCircle className="h-16 w-16 text-red-500" />
        </div>
        <h1 className="text-4xl font-bold text-gray-800 mb-3">404</h1>
        <p className="text-xl text-gray-600 mb-2">Страница не найдена</p>
        <p className="text-sm text-gray-500 mb-6">
          Запрошенный путь: {location.pathname}
        </p>
        <div className="flex flex-col gap-3">
          <Link
            to="/"
            className="text-blue-500 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-md font-medium transition-colors"
          >
            Вернуться на главную
          </Link>
          <a
            href="https://github.com/talkhint/public"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-600 hover:text-gray-800 text-sm underline"
          >
            Сообщить о проблеме
          </a>
        </div>
      </div>
    </div>
  );
};

export default NotFound;

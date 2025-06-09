import { useState } from "react";

const ArrivalModal = ({
  destination,
  onNewDestination,
  onExitVillage,
  onClose,
}) => {
  const [isExiting, setIsExiting] = useState(false);

  const handleExitVillage = () => {
    setIsExiting(true);
    onExitVillage();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Destination reached!
          </h2>
          <p className="text-gray-600 text-sm mb-4">
            You have arrived at your destination:
          </p>
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <p className="font-semibold text-gray-900">
              Block {destination.blockNumber}, Lot {destination.lotNumber}
            </p>
            {destination.address && (
              <p className="text-sm text-gray-600 mt-1">
                {destination.address}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={onNewDestination}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
            </svg>
            New destination in the village
          </button>

          <button
            onClick={handleExitVillage}
            disabled={isExiting}
            className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
          >
            {isExiting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Navigating to exit...
              </>
            ) : (
              <>
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                Exit the village
              </>
            )}
          </button>

          <button
            onClick={onClose}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors duration-200"
          >
            Close
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-4">
          Thank you for using MyGGV|GPS for your navigation!
        </p>
      </div>
    </div>
  );
};

export default ArrivalModal;

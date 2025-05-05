import React from 'react';

export default function LoadingSpinner() {
    return (
        <div className="flex justify-center items-center h-32">
            <div className="w-10 h-10 border-4 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );
}

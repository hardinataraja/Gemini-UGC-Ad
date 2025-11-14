
import React from 'react';

const UploadIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-4-4V6a4 4 0 014-4h10a4 4 0 014 4v6a4 4 0 01-4 4H7z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11V3m0 8l-3-3m3 3l3-3" />
  </svg>
);

export default UploadIcon;

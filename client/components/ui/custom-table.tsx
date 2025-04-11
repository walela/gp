import React from 'react';

export function CustomTable({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full h-full overflow-hidden shadow-md rounded-lg">
      <div className="w-full h-full overflow-x-auto rounded-t-lg">
        <table className={`w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400 border-collapse ${className || ''}`} {...props} />
      </div>
    </div>
  );
}

export function CustomTableHeader({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={`text-xs text-gray-800 uppercase bg-gray-100 dark:bg-gray-700 dark:text-gray-300 ${className || ''}`} {...props} />;
}

export function CustomTableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={`${className || ''} h-full`} {...props} />;
}

export function CustomTableRow({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={`odd:bg-white odd:dark:bg-gray-900 even:bg-gray-200/70 even:dark:bg-gray-700/70 border-b dark:border-gray-700 border-gray-200 ${
        className || ''
      }`}
      {...props}
    />
  );
}

export function CustomTableHead({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return <th scope="col" className={`px-3 py-4 sm:px-4 md:px-6 whitespace-nowrap font-semibold ${className || ''}`} {...props} />;
}

interface CustomTableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  isHeader?: boolean;
}

export function CustomTableCell({ className, isHeader, ...props }: CustomTableCellProps) {
  if (isHeader) {
    return (
      <th
        scope="row"
        className={`px-3 py-4 sm:px-4 md:px-6 font-medium text-gray-900 whitespace-nowrap dark:text-white ${className || ''}`}
        {...props}
      />
    );
  }
  return <td className={`px-3 py-3 sm:px-4 md:px-6 ${className || ''}`} {...props} />;
}

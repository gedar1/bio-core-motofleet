import React from "react";

export interface TableColumn<T> {
  readonly id: string;
  readonly header: React.ReactNode;
  readonly render: (row: T) => React.ReactNode;
  readonly className?: string;
}

export interface TableProps<T> {
  readonly rows: readonly T[];
  readonly columns: readonly TableColumn<T>[];
  readonly rowKey: keyof T | ((row: T) => React.Key);
  readonly loading?: boolean;
  readonly loadingContent?: React.ReactNode;
  readonly emptyContent?: React.ReactNode;
  readonly className?: string;
}

export const Table = <T,>({
  rows,
  columns,
  rowKey,
  loading = false,
  loadingContent = "Cargando...",
  emptyContent = "No hay datos para mostrar.",
  className = "",
}: TableProps<T>): React.ReactElement => {
  const getRowKey = (row: T, index: number): React.Key => {
    if (typeof rowKey === "function") return rowKey(row);

    const value = row[rowKey];
    return typeof value === "string" || typeof value === "number"
      ? value
      : index;
  };

  const renderMessage = (content: React.ReactNode) => (
    <tr className="bg-canvas">
      <td
        colSpan={columns.length}
        className="px-xl py-2xl text-center font-body text-body-md text-muted"
      >
        {content}
      </td>
    </tr>
  );

  let tableBody: React.ReactNode;

  if (loading) {
    tableBody = renderMessage(loadingContent);
  } else if (rows.length === 0) {
    tableBody = renderMessage(emptyContent);
  } else {
    tableBody = rows.map((row, index) => (
      <tr
        key={getRowKey(row, index)}
        className="border-t border-hairline-soft bg-canvas transition-colors hover:bg-surface"
      >
        {columns.map((column) => (
          <td
            key={column.id}
            className={`px-xl py-md font-body text-body-md text-ink text-nowrap ${column.className ?? ""}`}
          >
            {column.render(row)}
          </td>
        ))}
      </tr>
    ));
  }

  return (
    <div
      className={`w-full max-w-full overflow-x-auto border-primary-deep touch-pan-x overscroll-x-contain [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:h-[8px]
    [&::-webkit-scrollbar-track]:bg-surface-alt
    [&::-webkit-scrollbar-thumb]:bg-slate
    [&::-webkit-scrollbar-thumb]:rounded-full rounded-lg border  ${className}`}
    >
      <table className="min-w-[720px] w-full border-collapse text-left">
        <thead className="bg-surface">
          <tr>
            {columns.map((column) => (
              <th
                key={column.id}
                scope="col"
                className={`px-xl py-md font-body text-body-sm-medium text-nowrap text-ink ${column.className ?? ""}`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{tableBody}</tbody>
      </table>
    </div>
  );
};

export default Table;

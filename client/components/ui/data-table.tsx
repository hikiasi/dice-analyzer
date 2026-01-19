"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, X } from "lucide-react";
import type { CellData } from "@/lib/types";

interface DataTableProps {
  data: CellData[];
}

export function CellsDataTable({ data }: DataTableProps) {
  return (
    <ScrollArea className="h-[600px] rounded-md border">
      <Table>
        <TableHeader className="sticky top-0 bg-background">
          <TableRow>
            <TableHead className="w-[80px]">Строка</TableHead>
            <TableHead className="w-[80px]">Колонка</TableHead>
            <TableHead>Яркость</TableHead>
            <TableHead>Концентрация (%)</TableHead>
            <TableHead className="text-center">В интервале?</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data && data.map((cell, index) => (
            <TableRow key={`${cell.row}-${cell.col}`}>
              <TableCell className="font-medium">{cell.row + 1}</TableCell>
              <TableCell>{cell.col + 1}</TableCell>
              <TableCell>{cell.brightness.toFixed(2)}</TableCell>
              <TableCell>{cell.concentration.toFixed(2)}</TableCell>
              <TableCell className="flex items-center justify-center">
                {cell.in_interval ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <X className="h-4 w-4 text-red-500" />
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}

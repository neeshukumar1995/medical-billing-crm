"use client";

import React, { useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";

// Sample CRM sales data
const initialSales = [
  { id: "1", client: "ABC Pharmacy", amount: 5000 },
  { id: "2", client: "XYZ Clinic", amount: 8000 },
  { id: "3", client: "MNO Hospital", amount: 12000 },
];

// Sortable row component
function SortableRow({ item }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    cursor: "grab",
    background: "white",
    borderBottom: "1px solid #ddd",
  };

  return (
    <tr ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <td style={{ padding: "10px" }}>{item.client}</td>
      <td style={{ padding: "10px" }}>₹{item.amount}</td>
    </tr>
  );
}

export default function SalesReport() {
  const [sales, setSales] = useState(initialSales);

  // DnD Sensors
  const sensors = useSensors(useSensor(PointerSensor));

  // Drag end handler
  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over) return;

    if (active.id !== over.id) {
      const oldIndex = sales.findIndex((i) => i.id === active.id);
      const newIndex = sales.findIndex((i) => i.id === over.id);

      const updatedSales = [...sales];
      const [movedItem] = updatedSales.splice(oldIndex, 1);
      updatedSales.splice(newIndex, 0, movedItem);

      setSales(updatedSales);

      // TODO: Send updated order to backend
      // fetch("/api/update-order", { method: "POST", body: JSON.stringify(updatedSales) });
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead style={{ background: "#f3f3f3" }}>
          <tr>
            <th style={{ padding: "10px", textAlign: "left" }}>Client</th>
            <th style={{ padding: "10px", textAlign: "left" }}>Amount</th>
          </tr>
        </thead>
        <SortableContext items={sales.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <tbody>
            {sales.map((item) => (
              <SortableRow key={item.id} item={item} />
            ))}
          </tbody>
        </SortableContext>
      </table>
    </DndContext>
  );
}

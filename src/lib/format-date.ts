import { format, parseISO } from "date-fns";
import { frCH } from "date-fns/locale";

export function formatDate(date: string) {
  return format(parseISO(date), "d MMMM yyyy", { locale: frCH });
}

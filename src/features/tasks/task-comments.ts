type HistoryRow = {
  id: string;
  note: string | null;
  changedAt: string;
  changedBy: { name: string };
};

// A lead's comment is the note saved when they send a task back from Review.
export function leadComments(history: HistoryRow[]) {
  return history
    .filter((row) => row.note?.trim())
    .map((row) => ({ id: row.id, text: row.note!.trim(), author: row.changedBy.name, at: row.changedAt }))
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

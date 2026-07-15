export type HearingDiaryRow = {
  id: string;
  case_id: string;
  hearing_date: string;
  hearing_time: string | null;
  notes: string | null;
  next_hearing_date: string | null;
  next_hearing_time: string | null;
  created_at: string;
};

function compareHearings(left: HearingDiaryRow, right: HearingDiaryRow) {
  const leftSchedule = `${left.hearing_date}T${left.hearing_time ?? "00:00:00"}`;
  const rightSchedule = `${right.hearing_date}T${right.hearing_time ?? "00:00:00"}`;

  return (
    rightSchedule.localeCompare(leftSchedule) ||
    right.created_at.localeCompare(left.created_at)
  );
}

export function sortHearingsNewestFirst(rows: HearingDiaryRow[]) {
  return [...rows].sort(compareHearings);
}

export function getLatestHearingsByCase(rows: HearingDiaryRow[]) {
  const latestByCase = new Map<string, HearingDiaryRow>();

  for (const hearing of sortHearingsNewestFirst(rows)) {
    if (!latestByCase.has(hearing.case_id)) {
      latestByCase.set(hearing.case_id, hearing);
    }
  }

  return latestByCase;
}

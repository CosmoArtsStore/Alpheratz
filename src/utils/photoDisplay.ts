import { DisplayPhotoItem, Photo } from "../types";

export type DatePresetRange = "today" | "last7days" | "thisMonth" | "lastMonth" | "halfYear" | "oneYear";
export type PhotoGroupingMode = "none";

export const replaceTemplateToken = (template: string, token: string, value: string) => (
    template.split(token).join(value)
);

const formatDate = (date: Date) => date.toISOString().slice(0, 10);

const getToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
};

export const getDateRangeFromPreset = (preset: DatePresetRange) => {
    const today = getToday();

    if (preset === "today") {
        const value = formatDate(today);
        return { from: value, to: value };
    }

    if (preset === "last7days") {
        const from = new Date(today);
        from.setDate(today.getDate() - 6);
        return { from: formatDate(from), to: formatDate(today) };
    }

    if (preset === "thisMonth") {
        const from = new Date(today.getFullYear(), today.getMonth(), 1);
        const to = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        return { from: formatDate(from), to: formatDate(to) };
    }

    if (preset === "halfYear") {
        const from = new Date(today);
        from.setMonth(today.getMonth() - 6);
        return { from: formatDate(from), to: formatDate(today) };
    }

    if (preset === "oneYear") {
        const from = new Date(today);
        from.setFullYear(today.getFullYear() - 1);
        return { from: formatDate(from), to: formatDate(today) };
    }

    const from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const to = new Date(today.getFullYear(), today.getMonth(), 0);
    return { from: formatDate(from), to: formatDate(to) };
};

export const buildDisplayPhotoItems = (photos: Photo[]): DisplayPhotoItem[] => {
    return photos.map((photo) => ({ photo }));
};

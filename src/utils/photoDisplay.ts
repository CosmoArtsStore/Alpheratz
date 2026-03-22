import { DisplayPhotoItem, Photo } from "../types";

const SIMILAR_PHOTO_MAX_DISTANCE = 124;
const PDQ_HASH_HEX_RE = /^[0-9a-f]{64}$/i;

export type DatePresetRange = "today" | "last7days" | "thisMonth" | "lastMonth" | "halfYear" | "oneYear";
export type PhotoGroupingMode = "none" | "similar" | "world";

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

export const parseHashVariants = (value?: string | null): string[] => (
    (value ?? "")
        .split("|")
        .map((item) => item.trim().toLowerCase())
        .filter((item) => PDQ_HASH_HEX_RE.test(item))
);

const getPhotoHashVariants = (photo: Photo) => (
    Array.from(new Set(parseHashVariants(photo.phash)))
);

const getHammingDistance = (left: string, right: string) => {
    let distance = 0;
    for (let index = 0; index < left.length; index += 1) {
        const leftValue = Number.parseInt(left[index], 16);
        const rightValue = Number.parseInt(right[index], 16);
        const xor = leftValue ^ rightValue;
        distance += xor.toString(2).split("1").length - 1;
    }
    return distance;
};

const getClosestHashDistance = (left: string[], right: string[]) => {
    if (left.length === 0 || right.length === 0) {
        return null;
    }

    let best = Number.POSITIVE_INFINITY;
    for (const leftHash of left) {
        for (const rightHash of right) {
            const distance = getHammingDistance(leftHash, rightHash);
            if (distance < best) {
                best = distance;
            }
            if (best === 0) {
                return 0;
            }
        }
    }

    return Number.isFinite(best) ? best : null;
};

const normalizeWorldName = (value?: string | null) => (value ?? "").trim().toLocaleLowerCase("ja");

const canGroupByPhotoMeta = (left: Photo, right: Photo) => {
    const leftWorld = normalizeWorldName(left.world_name);
    const rightWorld = normalizeWorldName(right.world_name);

    if (leftWorld && rightWorld && leftWorld !== rightWorld) {
        return false;
    }

    const leftOrientation = left.orientation ?? "unknown";
    const rightOrientation = right.orientation ?? "unknown";
    if (leftOrientation !== "unknown" && rightOrientation !== "unknown" && leftOrientation !== rightOrientation) {
        return false;
    }

    if ((left.source_slot ?? 1) !== (right.source_slot ?? 1)) {
        return false;
    }

    return true;
};

const areAdjacentPhotosSimilar = (left: Photo, right: Photo) => {
    if (!canGroupByPhotoMeta(left, right)) {
        return false;
    }

    const distance = getClosestHashDistance(
        getPhotoHashVariants(left),
        getPhotoHashVariants(right),
    );

    return distance !== null && distance <= SIMILAR_PHOTO_MAX_DISTANCE;
};

const buildWorldGroupedPhotoItems = (photos: Photo[]): DisplayPhotoItem[] => {
    const groups = new Map<string, Photo[]>();

    for (const photo of photos) {
        const key = photo.world_name?.trim() || "ワールド不明";
        const current = groups.get(key);
        if (current) {
            current.push(photo);
        } else {
            groups.set(key, [photo]);
        }
    }

    return Array.from(groups.entries())
        .sort(([leftWorld, leftPhotos], [rightWorld, rightPhotos]) => {
            const worldCompare = leftWorld.localeCompare(rightWorld, "ja");
            if (worldCompare !== 0) {
                return worldCompare;
            }
            const leftTimestamp = leftPhotos[0]?.timestamp ?? "";
            const rightTimestamp = rightPhotos[0]?.timestamp ?? "";
            return rightTimestamp.localeCompare(leftTimestamp);
        })
        .map(([, group]) => {
            const sortedGroup = group.slice().sort((left, right) => right.timestamp.localeCompare(left.timestamp));
            return {
                photo: sortedGroup[0],
                groupCount: sortedGroup.length,
                groupPhotos: sortedGroup,
            };
        });
};

const buildAdjacentSimilarPhotoGroups = (photos: Photo[]) => {
    const groups: Photo[][] = [];
    let currentGroup: Photo[] = [];

    for (let index = 0; index < photos.length; index += 1) {
        const currentPhoto = photos[index];
        if (currentGroup.length === 0) {
            currentGroup = [currentPhoto];
            continue;
        }

        const previousPhoto = photos[index - 1];
        const anchorPhoto = currentGroup[0];

        if (
            areAdjacentPhotosSimilar(previousPhoto, currentPhoto)
            && areAdjacentPhotosSimilar(anchorPhoto, currentPhoto)
        ) {
            currentGroup.push(currentPhoto);
            continue;
        }

        groups.push(currentGroup);
        currentGroup = [currentPhoto];
    }

    if (currentGroup.length > 0) {
        groups.push(currentGroup);
    }

    return groups;
};

export const buildDisplayPhotoItems = (photos: Photo[], groupingMode: PhotoGroupingMode): DisplayPhotoItem[] => {
    if (groupingMode === "world") {
        return buildWorldGroupedPhotoItems(photos);
    }

    if (groupingMode !== "similar") {
        return photos.map((photo) => ({ photo }));
    }

    return buildAdjacentSimilarPhotoGroups(photos).map((group) => ({
        photo: group[0],
        groupCount: group.length,
        groupPhotos: group,
    }));
};

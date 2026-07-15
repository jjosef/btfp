export interface PetType {
    id: string;
    name: string;
    aliases: string[];
    /** Free-form facts about the pet type (e.g. typical size classes, notes). */
    details: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}
//# sourceMappingURL=pet-type.d.ts.map
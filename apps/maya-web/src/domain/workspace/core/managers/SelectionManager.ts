import type { WorkspaceSnapshot, MutableSnapshot } from '../types';

export class SelectionManager {
    constructor() { }

    public selectShape(snapshot: MutableSnapshot, id: string, multi: boolean): void {
        this.selectShapes(snapshot, [id], multi);
    }

    public selectShapes(snapshot: MutableSnapshot, ids: string[], append: boolean): void {
        if (append) {
            const unique = new Set([...snapshot.selectedShapeIds, ...ids]);
            this.setSelection(snapshot, Array.from(unique));
        } else {
            this.setSelection(snapshot, ids);
        }
    }

    public clearSelection(snapshot: MutableSnapshot): void {
        snapshot.selectedShapeId = null;
        snapshot.selectedShapeIds = [];
    }

    public setSelection(snapshot: MutableSnapshot, ids: string[]): void {
        snapshot.selectedShapeIds = [...ids];
        snapshot.selectedShapeId = ids.length > 0 ? ids[ids.length - 1] : null;
    }

    public getPrimarySelectionId(snapshot: WorkspaceSnapshot): string | null {
        return snapshot.selectedShapeId;
    }

    public getSelectedIds(snapshot: WorkspaceSnapshot): string[] {
        return snapshot.selectedShapeIds;
    }

    public isSelected(snapshot: WorkspaceSnapshot, id: string): boolean {
        return snapshot.selectedShapeIds.includes(id);
    }
}

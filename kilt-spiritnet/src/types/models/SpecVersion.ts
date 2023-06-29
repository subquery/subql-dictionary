// Auto-generated , DO NOT EDIT
import {Entity, FunctionPropertyNames} from "@subql/types";
import assert from 'assert';




export type SpecVersionProps = Omit<SpecVersion, NonNullable<FunctionPropertyNames<SpecVersion>>| '_name'>;

export class SpecVersion implements Entity {

    constructor(
        
            id: string,
        
            blockHeight: bigint,
        
    ) {
        
            this.id = id;
        
            this.blockHeight = blockHeight;
        
    }


    public id: string;

    public blockHeight: bigint;


    get _name(): string {
        return 'SpecVersion';
    }

    async save(): Promise<void>{
        let id = this.id;
        assert(id !== null, "Cannot save SpecVersion entity without an ID");
        await store.set('SpecVersion', id.toString(), this);
    }
    static async remove(id:string): Promise<void>{
        assert(id !== null, "Cannot remove SpecVersion entity without an ID");
        await store.remove('SpecVersion', id.toString());
    }

    static async get(id:string): Promise<SpecVersion | undefined>{
        assert((id !== null && id !== undefined), "Cannot get SpecVersion entity without an ID");
        const record = await store.get('SpecVersion', id.toString());
        if (record){
            return this.create(record as SpecVersionProps);
        }else{
            return;
        }
    }



    static create(record: SpecVersionProps): SpecVersion {
        assert(typeof record.id === 'string', "id must be provided");
        let entity = new this(
        
            record.id,
        
            record.blockHeight,
        );
        Object.assign(entity,record);
        return entity;
    }
}

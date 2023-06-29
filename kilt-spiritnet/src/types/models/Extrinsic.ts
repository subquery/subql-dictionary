// Auto-generated , DO NOT EDIT
import {Entity, FunctionPropertyNames} from "@subql/types";
import assert from 'assert';




export type ExtrinsicProps = Omit<Extrinsic, NonNullable<FunctionPropertyNames<Extrinsic>>| '_name'>;

export class Extrinsic implements Entity {

    constructor(
        
            id: string,
        
            module: string,
        
            call: string,
        
            blockHeight: bigint,
        
            success: boolean,
        
            isSigned: boolean,
        
    ) {
        
            this.id = id;
        
            this.module = module;
        
            this.call = call;
        
            this.blockHeight = blockHeight;
        
            this.success = success;
        
            this.isSigned = isSigned;
        
    }


    public id: string;

    public module: string;

    public call: string;

    public blockHeight: bigint;

    public success: boolean;

    public isSigned: boolean;


    get _name(): string {
        return 'Extrinsic';
    }

    async save(): Promise<void>{
        let id = this.id;
        assert(id !== null, "Cannot save Extrinsic entity without an ID");
        await store.set('Extrinsic', id.toString(), this);
    }
    static async remove(id:string): Promise<void>{
        assert(id !== null, "Cannot remove Extrinsic entity without an ID");
        await store.remove('Extrinsic', id.toString());
    }

    static async get(id:string): Promise<Extrinsic | undefined>{
        assert((id !== null && id !== undefined), "Cannot get Extrinsic entity without an ID");
        const record = await store.get('Extrinsic', id.toString());
        if (record){
            return this.create(record as ExtrinsicProps);
        }else{
            return;
        }
    }


    static async getByBlockHeight(blockHeight: bigint): Promise<Extrinsic[] | undefined>{
      
      const records = await store.getByField('Extrinsic', 'blockHeight', blockHeight);
      return records.map(record => this.create(record as ExtrinsicProps));
      
    }


    static create(record: ExtrinsicProps): Extrinsic {
        assert(typeof record.id === 'string', "id must be provided");
        let entity = new this(
        
            record.id,
        
            record.module,
        
            record.call,
        
            record.blockHeight,
        
            record.success,
        
            record.isSigned,
        );
        Object.assign(entity,record);
        return entity;
    }
}

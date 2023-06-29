// Auto-generated , DO NOT EDIT
import {Entity, FunctionPropertyNames} from "@subql/types";
import assert from 'assert';




export type EventProps = Omit<Event, NonNullable<FunctionPropertyNames<Event>>| '_name'>;

export class Event implements Entity {

    constructor(
        
            id: string,
        
            module: string,
        
            event: string,
        
            blockHeight: bigint,
        
    ) {
        
            this.id = id;
        
            this.module = module;
        
            this.event = event;
        
            this.blockHeight = blockHeight;
        
    }


    public id: string;

    public module: string;

    public event: string;

    public blockHeight: bigint;


    get _name(): string {
        return 'Event';
    }

    async save(): Promise<void>{
        let id = this.id;
        assert(id !== null, "Cannot save Event entity without an ID");
        await store.set('Event', id.toString(), this);
    }
    static async remove(id:string): Promise<void>{
        assert(id !== null, "Cannot remove Event entity without an ID");
        await store.remove('Event', id.toString());
    }

    static async get(id:string): Promise<Event | undefined>{
        assert((id !== null && id !== undefined), "Cannot get Event entity without an ID");
        const record = await store.get('Event', id.toString());
        if (record){
            return this.create(record as EventProps);
        }else{
            return;
        }
    }


    static async getByBlockHeight(blockHeight: bigint): Promise<Event[] | undefined>{
      
      const records = await store.getByField('Event', 'blockHeight', blockHeight);
      return records.map(record => this.create(record as EventProps));
      
    }


    static create(record: EventProps): Event {
        assert(typeof record.id === 'string', "id must be provided");
        let entity = new this(
        
            record.id,
        
            record.module,
        
            record.event,
        
            record.blockHeight,
        );
        Object.assign(entity,record);
        return entity;
    }
}

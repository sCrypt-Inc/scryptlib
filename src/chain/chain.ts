import { Factory } from "./base/factory";
import { BSVFactory } from "./bsv/factory";



export class Chain {

    static readonly BSV = 0;
    static readonly MVC = 1;

    static readonly BTC = 1;

    private static instance: Factory;

    private constructor() { }

    static initFactory(C: Chain = Chain.BSV) {

        if (!Chain.instance) {

            const bsvFactory = new BSVFactory();

            switch (C) {
                case Chain.BSV:
                    Chain.instance = bsvFactory;
                    break;
                default:
                    Chain.instance = bsvFactory;

            }
        } else {
            throw new Error(`already init`);
        }
    }

    static getFactory(): Factory {
        if (!Chain.instance) {
            Chain.initFactory();
        }
        return Chain.instance;
    }
}



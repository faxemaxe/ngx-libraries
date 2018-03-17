import { Observable } from 'rxjs/Observable';
import { NgxStreamCrudItem } from './ngx-stream-crud-item.interface';
import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot} from '@angular/router';
import { NgxStreamCrudService } from './ngx-stream-crud.service';
import { map, skipWhile, first } from 'rxjs/operators'

@Injectable()
export abstract class NgxStreamCrudResolver<T extends NgxStreamCrudItem> implements Resolve<T> {

    protected abstract idIsInteger: boolean;
    protected abstract paramKey: string;
    protected resolveFailed: any = () => { console.log('resolver failed') };

    constructor(
        private service: NgxStreamCrudService<T>,
    ) { }

    resolve(
        route: ActivatedRouteSnapshot
    ): Observable<T> {
        const itemId = this.idIsInteger ? parseInt(route.params[this.paramKey], 10) : route.params[this.paramKey];
        let skipCounter = 2;

        return this.service.dataStream
            .pipe(
                map((items: T[]) => items.find((item: T) => item.id === itemId)),
                skipWhile(
                    (item: T) => {
                        if (!skipCounter--) {
                            this.resolveFailed();
                            return null;
                        }
                        if (!item) {
                            this.service.getOne(itemId);
                        }
                        return !item;
                    }
                ),
                first()
            )
    }
}
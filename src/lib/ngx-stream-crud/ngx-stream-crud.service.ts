import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Observable } from 'rxjs/Observable';
import { catchError, retry, map, distinctUntilChanged } from 'rxjs/operators';

import { NgxStreamCrudItem } from './ngx-stream-crud-item.interface';

@Injectable()
export abstract class NgxStreamCrudService<T extends NgxStreamCrudItem> {
	
	protected dataStore: BehaviorSubject<T[]>;

	protected abstract get endpointUrl(): string;
	protected abstract handleJsonObject(jsonObject: any): T;
	
	constructor(
		protected httpClient: HttpClient
	) {
		this.dataStore = new BehaviorSubject([]);
	}
	
	get dataStream(): Observable<T[]> {
		return this.dataStore
			.asObservable()
			.pipe(
				distinctUntilChanged()
			);
	}

	protected postHook: any = (item: T) => { };
	protected putHook: any = (item: T) => { };
	protected deleteeHook: any = (item: T) => { };

	public getAll(additionalParams?: { [key: string]: string }, append?: boolean): void {
		this.httpClient.get(
			`${this.endpointUrl}`,
			{
				params: this.renderParams(additionalParams),
			}
		).pipe(
			retry(2),
			map(
				(data: T[]) => {
					return data.map(item => {
						return this.handleJsonObject(item);
					});
				}
			)
		).subscribe(
			(items: T[]) => {
				if (!append) {
					this.dataStore.next(items);
				} else {
					this.appendItems(items);
				}
			},
			(error: any) => {
				console.error('Service Error', this.renderError('GET', error));
			}
		)
	}

	public getOne(id: string | number, additionalParams?: { [key: string]: string }): void {
		this.httpClient.get(
			`${this.endpointUrl}`,
			{
				params: this.renderParams(additionalParams),
			}
		).pipe(
			retry(2),
			map(
				(data: any) => {
					return this.handleJsonObject(data);
				}
			),
		).subscribe(
			(item: T) => {
				this.appendItems([ item ]);
			},
			(error: any) => {
				console.error('Service Error', error);
				return Observable.throw(
					this.renderError('GET', error)
				);
			}
		)
	}

	public post(item: T, additionalParams?: { [key: string]: string }): void {
		this.httpClient.post(
			`${this.endpointUrl}`,
			item,
			{
				params: this.renderParams(additionalParams),
			}
		).pipe(
			retry(2),
			map(
				(data: any) => {
					return this.handleJsonObject(data);
				}
			),
		).subscribe(
			(item: T) => {
				this.appendItems([ item ]);
				this.postHook(item);
			},
			(error: any) => {
				console.error('Service Error', error);
				return Observable.throw(
					this.renderError('POST', error)
				);
			}
		)
	}

	public put(item: T, additionalParams?: { [key: string]: string }): void {
		this.httpClient.post(
			`${this.endpointUrl}/${item.id}`,
			item,
			{
				params: this.renderParams(additionalParams),
			}
		).pipe(
			retry(2),
			map(
				(data: any) => {
					return this.handleJsonObject(data);
				}
			),
		).subscribe(
			(item: T) => {
				this.appendItems([ item ]);
				this.putHook(item);
			},
			(error: any) => {
				console.error('Service Error', error);
				return Observable.throw(
					this.renderError('POST', error)
				);
			}
		)
	}
	
	public delete(item: T, additionalParams?: { [key: string]: string }): void {
		this.httpClient.delete(
			`${this.endpointUrl}/${item.id}`,
			{
				params: this.renderParams(additionalParams),
			}
		).pipe(
			retry(2)
		).subscribe(
			(data) => {
				this.removeItem(item);
				this.deleteeHook(item);
			}
		)
	}

	protected appendItems(items: T[]): void {
		const ds = this.dataStore.getValue();
		items.forEach((item: T) => {
			let found = ds.findIndex((dsItem) => item.id === dsItem.id);
			if (found >= 0) {
				ds[found] = item;
			} else {
				ds.push(item);
			}
		});
		this.dataStore.next(ds);
	}

	protected removeItem(item: T):void {
		const ds = this.dataStore.getValue();
		let found = ds.findIndex((dsItem) => dsItem.id === item.id);
		if (found >= 0) {
			ds.splice(found, 1);
		}
		this.dataStore.next(ds);
	}

	protected renderParams(additionalParams: { [key: string]: string }): HttpParams {
		let params = new HttpParams();
		for (const key in additionalParams) {
			if (additionalParams.hasOwnProperty(key)) {
				params = params.append(key, additionalParams[key]);
			}
		}
		return params;
	}

	protected renderError(method: string, error: any): any {
		return {
			message: 'Something went wrong!',
			httpMethod: method,
			error,
		}
	}
}

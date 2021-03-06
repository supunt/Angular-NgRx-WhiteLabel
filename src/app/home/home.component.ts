import { Component, OnInit, ViewChild } from '@angular/core';
import { LatLong, GoogleMapMarker, Property, User,
         GoolgPlacePrediction, Guid, AddressSearchModalService, GoogleMapStateService, AddressInfoModalService } from '../shared/export';
import { ComponentBase } from '../shared/classes/exports';
import { IconColorService } from '../shared/services/icon-color.service';
import { GoogleMapComponent } from '../shared/components/google-map/google-map.component';
import { Store, select } from '@ngrx/store';
import { Observable } from 'rxjs';
import * as UserPropertyAction from '../shared/actions/user-properties.action';
import UserPropertiesState from '../shared/state/user-properties.state';


declare var google: any;

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent extends ComponentBase implements OnInit {

  @ViewChild('theMap', {static : false}) gmap: GoogleMapComponent;

  userLocations$: Observable<UserPropertiesState>;

  constructor(
    private mapStateSvc: GoogleMapStateService,
    private addressInfoSvc: AddressInfoModalService,
    private icolorSvc: IconColorService,
    private store: Store<{ userProperties: UserPropertiesState }>) {
      super();
      this.userLocations$ = store.pipe(select('userProperties'));
  }

  pin: GoogleMapMarker = null;
  activeAddressList: Property[] = [];
  private mapReady = false;

  // -------------------------------------------------------------------------------------------------------------------
  ngOnInit() {
    this.rxs(this.userLocations$.subscribe(
      data => {
        this.activeAddressList = data.userProperties;
        if (data.userPropertiesError != null) {
          console.error(data.userPropertiesError);
        } else {
          if (this.gmap != null && this.mapReady) {
              this.gmap.SetUserMarkers(this.activeAddressList, false);
          }
        }
      }
    ));

    this.store.dispatch(UserPropertyAction.BeginGetPropertiesAction());

    this.rxs(this.mapStateSvc.$mapState.subscribe(
      (state) =>  {
        setTimeout(() => {
          this.mapReady = true;
          this.gmap.SetUserMarkers(this.activeAddressList, false);
        }, 500);
      }));
  }

  // -------------------------------------------------------------------------------------------------------------------
  OnPinDrop(pin: GoogleMapMarker) {
  }

  // -------------------------------------------------------------------------------------------------------------------
  OnPinSelected(item: Property) {
    const activeAddress = this.activeAddressList.filter(x => x.uuid === item.uuid);

    this.addressInfoSvc.Open(
      (saveMarker) => {
        saveMarker.draggable = false;
        this.SaveMarker(saveMarker);
      },
      (deleteMarker) => {
        if (!deleteMarker.saved) {
          this.gmap.DeleteMarker(deleteMarker);
          return;
        }
        this.store.dispatch(UserPropertyAction.BeginRemovePropertyAction({ payload: deleteMarker }));
      }, item);
  }

  // -------------------------------------------------------------------------------------------------------------------
  OnAddressListRefeshReq() {
    this.store.dispatch(UserPropertyAction.BeginGetPropertiesAction());
  }

  // -------------------------------------------------------------------------------------------------------------------
  SaveMarker(pin: Property) {
    pin.iconColor = this.icolorSvc.getUserIconColor();
    this.store.dispatch(UserPropertyAction.BeginSavePropertyAction({ payload: pin }));
  }

  // -------------------------------------------------------------------------------------------------------------------
  OnDeleteMarker(pin: Property) {
    console.log('Deleting marker', pin);
    this.store.dispatch(UserPropertyAction.BeginRemovePropertyAction({ payload: pin }));
  }

  // -------------------------------------------------------------------------------------------------------------------
  OnAddressDeleteRequest(prop: Property) {
    if (!prop.saved) {
      this.gmap.DeleteMarker(prop);
      return;
    }
    this.store.dispatch(UserPropertyAction.BeginRemovePropertyAction({ payload: prop }));
  }

  // -------------------------------------------------------------------------------------------------------------------
  OnAddressPrediction(address: GoolgPlacePrediction) {
    const placeDetailSvc = new google.maps.places.PlacesService(document.createElement('div'));
    placeDetailSvc.getDetails({placeId : address.place_id}, (data, status) => {
      console.log('Place details', data);
      const newMarker: GoogleMapMarker = {
        address: address.description,
        draggable: true,
        lat: data.geometry.location.lat(),
        lng: data.geometry.location.lng(),
        uuid: Guid.newGuid(),
        saved: false,
        iconColor: this.icolorSvc.getUserIconColor(),
        label: 'New Location'
      };

      console.log('Adding new marker by search', newMarker);
      this.gmap.markers.push(newMarker);
      this.gmap.FocusMarker(newMarker);
    });
  }
}

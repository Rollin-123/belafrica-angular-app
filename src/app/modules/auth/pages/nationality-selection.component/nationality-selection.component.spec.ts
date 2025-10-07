import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NationalitySelectionComponent } from './nationality-selection.component';

describe('NationalitySelectionComponent', () => {
  let component: NationalitySelectionComponent;
  let fixture: ComponentFixture<NationalitySelectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NationalitySelectionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NationalitySelectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

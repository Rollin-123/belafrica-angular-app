import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FeedNationalComponent } from './feed-national.component';

describe('FeedNationalComponent', () => {
  let component: FeedNationalComponent;
  let fixture: ComponentFixture<FeedNationalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FeedNationalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FeedNationalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

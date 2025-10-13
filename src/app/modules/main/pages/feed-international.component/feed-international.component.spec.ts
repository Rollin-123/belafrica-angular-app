import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FeedInternationalComponent } from './feed-international.component';

describe('FeedInternationalComponent', () => {
  let component: FeedInternationalComponent;
  let fixture: ComponentFixture<FeedInternationalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FeedInternationalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FeedInternationalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

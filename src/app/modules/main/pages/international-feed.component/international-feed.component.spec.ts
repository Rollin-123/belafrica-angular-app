import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InternationalFeedComponent } from './international-feed.component';

describe('InternationalFeedComponent', () => {
  let component: InternationalFeedComponent;
  let fixture: ComponentFixture<InternationalFeedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InternationalFeedComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InternationalFeedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminCodeGeneratorComponent } from './admin-code-generator.component';

describe('AdminCodeGeneratorComponent', () => {
  let component: AdminCodeGeneratorComponent;
  let fixture: ComponentFixture<AdminCodeGeneratorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminCodeGeneratorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminCodeGeneratorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

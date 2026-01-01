import { TestBed } from '@angular/core/testing';

import { PostsMockService } from './posts-mock.service';

describe('PostsService', () => {
  let service: PostsMockService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PostsMockService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

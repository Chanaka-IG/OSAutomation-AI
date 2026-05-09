import { BaseApiService } from '../BaseApiService';

/** Example service: replace with your API modules under `src/api/<product>/`. */
export class PostsApi extends BaseApiService {
  getById(id: number) {
    return this.get(`/posts/${id}`);
  }

  list() {
    return this.get('/posts');
  }
}

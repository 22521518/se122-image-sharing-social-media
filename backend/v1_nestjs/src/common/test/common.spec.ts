import { Test, TestingModule } from '@nestjs/testing';
import { GlobalExceptionFilter } from '../filters/global-exception.filter';
import { ResponseInterceptor } from '../interceptors/response.interceptor';
import { CommonModule } from '../common.module';
import { HttpException, HttpStatus, CallHandler } from '@nestjs/common';
import { of, throwError } from 'rxjs';

describe('CommonModule', () => {
  let filter: GlobalExceptionFilter;
  let interceptor: ResponseInterceptor<any>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [CommonModule],
    }).compile();

    // Manually instantiate since we want to test logic directly usually,
    // but here we check if module extracts them.
    // Actually, let's just test the classes directly for unit tests.
    filter = new GlobalExceptionFilter();
    interceptor = new ResponseInterceptor();
  });

  describe('GlobalExceptionFilter', () => {
    it('should catch exceptions and format response', () => {
      const mockJson = jest.fn();
      const mockStatus = jest.fn().mockImplementation(() => ({
        json: mockJson,
      }));
      const mockGetResponse = jest.fn().mockReturnValue({
        status: mockStatus,
      });
      const mockGetRequest = jest.fn().mockReturnValue({
        url: '/test',
      });
      const mockContext = {
        switchToHttp: () => ({
          getResponse: mockGetResponse,
          getRequest: mockGetRequest,
        }),
      } as any;

      const exception = new HttpException('Forbidden', HttpStatus.FORBIDDEN);
      filter.catch(exception, mockContext);

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'HTTP', // NestJS basic error name from constructor name "HttpException" -> HTTP
            message: 'Forbidden',
            path: '/test'
          })
        })
      );
    });
  });

  describe('ResponseInterceptor', () => {
    it('should transform successful response', async () => {
      const next: CallHandler = {
        handle: () => of({ test: 'data' }),
      };

      const result = await interceptor.intercept({} as any, next).toPromise();

      expect(result).toEqual(
        expect.objectContaining({
          success: true,
          data: { test: 'data' },
          meta: expect.objectContaining({
            timestamp: expect.any(String)
          })
        })
      );
    });
  });
});

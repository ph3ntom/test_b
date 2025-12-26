import { BadRequestException } from '@nestjs/common';
import { extname } from 'path';
import * as fs from 'fs';

export class FileValidator {
  // 파일 시그니처 (Magic Number) 매핑
  private static readonly FILE_SIGNATURES = {
    jpg: [
      { signature: [0xff, 0xd8, 0xff], offset: 0 }, // JPEG
    ],
    jpeg: [
      { signature: [0xff, 0xd8, 0xff], offset: 0 }, // JPEG
    ],
    png: [
      { signature: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], offset: 0 }, // PNG
    ],
    gif: [
      { signature: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], offset: 0 }, // GIF87a
      { signature: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], offset: 0 }, // GIF89a
    ],
    pdf: [
      { signature: [0x25, 0x50, 0x44, 0x46], offset: 0 }, // %PDF
    ],
    doc: [
      { signature: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1], offset: 0 }, // MS Office
    ],
    docx: [
      { signature: [0x50, 0x4b, 0x03, 0x04], offset: 0 }, // ZIP (DOCX는 ZIP 기반)
    ],
    txt: [], // 텍스트 파일은 시그니처가 없음 (내용 검증으로 대체)
  };

  private static readonly MAX_SIGNATURE_LENGTH = 8;
  // 허용된 MIME 타입
  private static readonly ALLOWED_MIMES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ];

  // 허용된 확장자
  private static readonly ALLOWED_EXTENSIONS = [
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.pdf',
    '.doc',
    '.docx',
    '.txt',
  ];

  // MIME 타입과 확장자 매핑
  private static readonly MIME_EXT_MAP = {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/gif': ['.gif'],
    'application/pdf': ['.pdf'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
      '.docx',
    ],
    'text/plain': ['.txt'],
  };

  /**
   * 파일 타입 검증 (MIME + 확장자)
   */
  static validateFileType(file: Express.Multer.File): boolean {
    const ext = extname(file.originalname).toLowerCase();

    // MIME 타입 검증
    if (!this.ALLOWED_MIMES.includes(file.mimetype)) {
      throw new BadRequestException('허용되지 않는 파일 형식입니다.');
    }

    // 확장자 검증
    if (!this.ALLOWED_EXTENSIONS.includes(ext)) {
      throw new BadRequestException('허용되지 않는 파일 확장자입니다.');
    }

    // MIME-확장자 일치 검증
    const allowedExts = this.MIME_EXT_MAP[file.mimetype];
    if (!allowedExts || !allowedExts.includes(ext)) {
      throw new BadRequestException(
        '파일 형식과 확장자가 일치하지 않습니다.',
      );
    }

    return true;
  }

  /**
   * 파일명 안전화
   */
  static sanitizeFilename(filename: string): string {
    return (
      filename
        // 위험한 문자 제거 (한글, 영문, 숫자, 점, 하이픈만 허용)
        .replace(/[^a-zA-Z0-9가-힣.\-]/g, '_')
        // 연속된 점 제거
        .replace(/\.{2,}/g, '.')
        // 시작 점 제거
        .replace(/^\.+/, '')
    );
  }

  /**
   * 파일 크기 검증 (타입별 차등)
   */
  static validateFileSize(file: Express.Multer.File): boolean {
    const ext = extname(file.originalname).toLowerCase();
    const imageExts = ['.jpg', '.jpeg', '.png', '.gif'];

    // 이미지: 2MB, 문서: 5MB
    const maxSize = imageExts.includes(ext)
      ? 2 * 1024 * 1024
      : 5 * 1024 * 1024;

    if (file.size > maxSize) {
      throw new BadRequestException(
        `파일 크기가 제한을 초과했습니다. (최대 ${maxSize / 1024 / 1024}MB)`,
      );
    }

    return true;
  }

  /**
   * Magic Number 검증 (파일 시그니처)
   */
  static async validateMagicNumber(
    filePath: string,
    expectedExt: string,
  ): Promise<boolean> {
    try {
      // 파일의 처음 몇 바이트 읽기
      const buffer = Buffer.alloc(this.MAX_SIGNATURE_LENGTH);
      const fd = await fs.promises.open(filePath, 'r');
      await fd.read(buffer, 0, this.MAX_SIGNATURE_LENGTH, 0);
      await fd.close();

      // 확장자에 맞는 시그니처 가져오기
      const ext = expectedExt.toLowerCase().replace('.', '');
      const signatures = this.FILE_SIGNATURES[ext];

      // 텍스트 파일은 시그니처 검증 스킵
      if (!signatures || signatures.length === 0) {
        return true;
      }

      // 시그니처 매칭 확인
      for (const { signature, offset } of signatures) {
        let match = true;
        for (let i = 0; i < signature.length; i++) {
          if (buffer[offset + i] !== signature[i]) {
            match = false;
            break;
          }
        }
        if (match) {
          return true;
        }
      }

      // 시그니처가 일치하지 않음
      console.log(
        `Magic Number 불일치: ${ext}, Buffer: ${buffer.toString('hex').substring(0, 20)}`,
      );
      return false;
    } catch (error) {
      console.error('Magic Number 검증 실패:', error);
      return false;
    }
  }

  /**
   * 기존 파일 삭제
   */
  static async deleteFile(filePath: string): Promise<void> {
    if (!filePath) return;

    try {
      const fullPath = filePath.startsWith('./')
        ? filePath
        : `./${filePath}`;

      if (fs.existsSync(fullPath)) {
        await fs.promises.unlink(fullPath);
        console.log(`파일 삭제 성공: ${fullPath}`);
      }
    } catch (error) {
      console.error(`파일 삭제 실패: ${filePath}`, error);
      // 파일 삭제 실패는 치명적이지 않으므로 에러를 throw하지 않음
    }
  }
}

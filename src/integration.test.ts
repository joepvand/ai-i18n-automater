import { execSync } from 'child_process';
import { writeFileSync, readFileSync, unlinkSync, existsSync } from 'fs';
import * as path from 'path';

describe('CLI Integration Tests', () => {
  const testDir = path.join(__dirname, 'test-temp');
  const testSourceFile = path.join(testDir, 'en.json');
  const testOutputFile = path.join(testDir, 'nl.json');

  beforeAll(() => {
    // Create test directory if it doesn't exist
    if (!existsSync(testDir)) {
      execSync(`mkdir -p ${testDir}`);
    }
  });

  afterEach(() => {
    // Clean up test files
    [testSourceFile, testOutputFile].forEach(file => {
      if (existsSync(file)) {
        unlinkSync(file);
      }
    });
  });

  afterAll(() => {
    // Clean up test directory
    if (existsSync(testDir)) {
      execSync(`rm -rf ${testDir}`);
    }
  });

  it('should show usage message when no arguments provided', () => {
    try {
      execSync('node dist/main.js', { cwd: __dirname, stdio: 'pipe' });
      fail('Expected command to exit with error');
    } catch (error: any) {
      expect(error.status).toBe(1);
      expect(error.stderr.toString()).toContain('Usage:');
    }
  });

  it('should show usage message when source file is missing', () => {
    try {
      execSync('node dist/main.js --to nl', { cwd: __dirname, stdio: 'pipe' });
      fail('Expected command to exit with error');
    } catch (error: any) {
      expect(error.status).toBe(1);
      expect(error.stderr.toString()).toContain('Usage:');
    }
  });

  it('should show usage message when target languages are missing', () => {
    // Create a test source file
    const testData = { 'test.key': 'Test Value' };
    writeFileSync(testSourceFile, JSON.stringify(testData, null, 2));

    try {
      execSync(`node dist/main.js ${testSourceFile}`, { cwd: __dirname, stdio: 'pipe' });
      fail('Expected command to exit with error');
    } catch (error: any) {
      expect(error.status).toBe(1);
      expect(error.stderr.toString()).toContain('Usage:');
    }
  });

  it('should handle file not found error gracefully', () => {
    try {
      execSync('node dist/main.js nonexistent.json --to nl', { cwd: __dirname, stdio: 'pipe' });
      fail('Expected command to exit with error');
    } catch (error: any) {
      expect(error.status).toBe(1);
      // Should fail due to file not found
    }
  });

  it('should parse command line arguments correctly', () => {
    // Create a test source file
    const testData = { 'test.key': 'Test Value' };
    writeFileSync(testSourceFile, JSON.stringify(testData, null, 2));

    // This test will fail at the API call stage, but we can verify it gets that far
    // by checking that it doesn't fail at argument parsing
    try {
      execSync(`node dist/main.js ${testSourceFile} --to nl --outDir ${testDir}`, { 
        cwd: __dirname, 
        stdio: 'pipe',
        timeout: 5000 // 5 second timeout to avoid hanging
      });
    } catch (error: any) {
      // We expect this to fail at the API call stage, not at argument parsing
      const stderr = error.stderr.toString();
      const stdout = error.stdout.toString();
      
      // Should show that it loaded the file and parsed arguments correctly
      expect(stdout).toContain('Loaded');
      expect(stdout).toContain('with 1 keys');
      expect(stdout).toContain('Translating to: nl');
    }
  });
});
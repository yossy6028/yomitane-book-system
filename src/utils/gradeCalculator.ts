/**
 * 学年計算ユーティリティ
 * 4月1日を基準に学年を切り替える
 */

export interface GradeInfo {
  grade: number;
  gradeLabel: string;
  readingLevel: string;
  isNewGrade: boolean; // 新学年かどうか
}

/**
 * 生年月日から現在の学年を計算（4月1日基準）
 */
export function calculateCurrentGrade(birthDate: Date): GradeInfo {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1; // 0-11 → 1-12
  
  // 学年開始年度を計算（4月1日基準）
  const schoolYear = currentMonth >= 4 ? currentYear : currentYear - 1;
  
  // 生年月日から年齢を計算
  const birthYear = birthDate.getFullYear();
  const birthMonth = birthDate.getMonth() + 1;
  const birthDay = birthDate.getDate();
  
  // 学年開始時点での年齢を計算
  let ageAtSchoolStart = schoolYear - birthYear;
  
  // 4月1日時点での年齢調整
  const schoolStartDate = new Date(schoolYear, 3, 1); // 4月1日
  const birthDateInSchoolYear = new Date(schoolYear, birthMonth - 1, birthDay);
  
  if (birthDateInSchoolYear > schoolStartDate) {
    ageAtSchoolStart--;
  }
  
  // 学年計算（6歳で小学1年生）
  const grade = ageAtSchoolStart - 5;
  
  // 新学年判定（4月1日から4月30日まで）
  const isNewGrade = currentMonth === 4;
  
  return {
    grade: Math.max(1, Math.min(12, grade)), // 1-12年生の範囲
    gradeLabel: getGradeLabel(grade),
    readingLevel: getReadingLevelFromGrade(grade),
    isNewGrade
  };
}

/**
 * 年齢から学年を計算（従来の方法、4月基準調整版）
 */
export function calculateGradeFromAge(age: number): GradeInfo {
  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  
  // 4月以降なら新学年、3月以前なら前学年
  const adjustedAge = currentMonth >= 4 ? age : age - 1;
  const grade = Math.max(1, adjustedAge - 5);
  
  const isNewGrade = currentMonth === 4;
  
  return {
    grade: Math.max(1, Math.min(12, grade)),
    gradeLabel: getGradeLabel(grade),
    readingLevel: getReadingLevelFromGrade(grade),
    isNewGrade
  };
}

/**
 * 学年からラベルを取得
 */
export function getGradeLabel(grade: number): string {
  if (grade >= 1 && grade <= 6) {
    return `小学${grade}年生`;
  } else if (grade >= 7 && grade <= 9) {
    return `中学${grade - 6}年生`;
  } else if (grade >= 10 && grade <= 12) {
    return `高校${grade - 9}年生`;
  }
  return `${grade}年生`;
}

/**
 * 学年から読書レベルを取得
 */
export function getReadingLevelFromGrade(grade: number): string {
  if (grade >= 1 && grade <= 2) {
    return '小学校低学年';
  } else if (grade >= 3 && grade <= 4) {
    return '小学校中学年';
  } else if (grade >= 5 && grade <= 8) {
    return '小学校高学年〜中学1・2年';
  } else {
    return '高校受験レベル';
  }
}

/**
 * 新学年メッセージを取得
 */
export function getNewGradeMessage(gradeInfo: GradeInfo): string {
  if (gradeInfo.isNewGrade) {
    return `🌸 新学年おめでとう！${gradeInfo.gradeLabel}になったね！`;
  }
  return '';
}

/**
 * 学年に応じた年齢範囲を取得
 */
export function getAgeRangeFromGrade(grade: number): { min: number; max: number } {
  const baseAge = grade + 5;
  return {
    min: Math.max(6, baseAge),
    max: Math.min(18, baseAge + 1)
  };
}
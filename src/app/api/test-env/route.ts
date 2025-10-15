import { NextResponse } from 'next/server';

export async function GET() {
  const username = process.env.WEBDAV_USERNAME || 'NOT_SET';
  const password = process.env.WEBDAV_PASSWORD || 'NOT_SET';
  
  return NextResponse.json({
    username: username,
    passwordLength: password.length,
    passwordFirst3: password.substring(0, 3),
    passwordLast3: password.substring(password.length - 3),
    // Show each character's unicode to detect encoding issues
    passwordChars: password.split('').slice(0, 10).map((c, i) => ({
      index: i,
      char: c,
      unicode: c.charCodeAt(0),
      hex: c.charCodeAt(0).toString(16)
    }))
  });
}

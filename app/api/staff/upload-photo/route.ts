import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || user.userType !== 'staff') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const studentId = parseInt(formData.get('studentId') as string);

    if (!file || !studentId) {
      return NextResponse.json(
        { error: 'File and student ID are required' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');
    const mimeType = file.type;
    const photoUrl = `data:${mimeType};base64,${base64}`;

    const student = await prisma.account.update({
      where: { id: studentId },
      data: { photoUrl }
    });

    return NextResponse.json({
      success: true,
      photoUrl: student.photoUrl
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    );
  }
}

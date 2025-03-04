import { prisma } from './prisma';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/session';

export async function getUser() {
  const sessionCookie = (await cookies()).get('session');
  if (!sessionCookie || !sessionCookie.value) {
    return null;
  }

  const sessionData = await verifyToken(sessionCookie.value);
  if (!sessionData || !sessionData.user) {
    return null;
  }

  if (new Date(sessionData.expires) < new Date()) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: {
      id: sessionData.user.id,
      deletedAt: null,
    },
  });

  return user;
}

export async function getTeamByStripeCustomerId(customerId: string) {
  return await prisma.team.findUnique({
    where: {
      stripeCustomerId: customerId,
    },
  });
}

export async function updateTeamSubscription(
  teamId: string,
  subscriptionData: {
    stripeSubscriptionId: string | null;
    stripeProductId: string | null;
    planName: string | null;
    subscriptionStatus: string;
  }
) {
  await prisma.team.update({
    where: { id: teamId },
    data: {
      ...subscriptionData,
      updatedAt: new Date(),
    },
  });
}

export async function getUserWithTeam(userId: string) {
  return await prisma.user.findUnique({
    where: { id: userId },
    include: {
      teamMembers: true,
    },
  });
}

export async function getActivityLogs() {
  const user = await getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  return await prisma.activityLog.findMany({
    where: {
      userId: user.id,
    },
    include: {
      user: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      timestamp: 'desc',
    },
    take: 10,
  });
}

export async function getTeamForUser(userId: string) {
  const result = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      teamMembers: {
        include: {
          team: {
            include: {
              teamMembers: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  return result?.teamMembers[0]?.team || null;
}

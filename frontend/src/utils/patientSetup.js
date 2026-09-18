import axios from 'axios';

export const isPatientProfileComplete = (profile, onboarding) => {
  const hasProfile =
    Boolean(profile?.condition?.trim()) &&
    Boolean(profile?.stage?.trim()) &&
    Boolean(profile?.diagnosisDate);

  const hasOnboarding = Boolean(onboarding?.ckdStage);

  return hasProfile && hasOnboarding;
};

export const getPatientHomePath = async (userId, apiBaseUrl) => {
  try {
    const [profileRes, onboardingRes] = await Promise.all([
      axios.get(`${apiBaseUrl}/api/patient/${userId}/profile`),
      axios.get(`${apiBaseUrl}/api/patient/${userId}/onboarding`)
    ]);
    const complete = isPatientProfileComplete(
      profileRes.data.profile,
      onboardingRes.data.onboarding
    );
    return complete ? '/patient/home' : '/patient/setup';
  } catch {
    return '/patient/setup';
  }
};

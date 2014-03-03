# -*- coding: utf-8 -*-
"""
This test file will verify proper password history enforcement
"""
from django.test import TestCase
from django.utils import timezone
from mock import patch
from student.tests.factories import UserFactory, AdminFactory

from student.models import PasswordHistory
from freezegun import freeze_time
from datetime import timedelta


@patch.dict("django.conf.settings.FEATURES", {'ADVANCED_SECURITY': True})
class TestPasswordHistory(TestCase):
    """
    All the tests that assert proper behavior regarding password history
    """

    def _change_password(self, user, password):
        """
        Helper method to change password on user and record in the PasswordHistory
        """
        user.set_password(password)
        user.save()
        history = PasswordHistory()
        history.create(user)

    def _user_factory_with_history(self, is_staff=False):
        if is_staff:
            user = AdminFactory()
        else:
            user = UserFactory()
        history = PasswordHistory()
        history.create(user)
        return user

    @patch.dict("django.conf.settings.FEATURES", {'ADVANCED_SECURITY': False})
    def test_disabled_feature(self):
        """
        Test that behavior is normal when this feature is not turned on
        """
        user = UserFactory()
        staff = AdminFactory()

        # if feature is disabled user can keep reusing same password
        self.assertTrue(PasswordHistory.validate_password_reuse(user, "test"))
        self.assertTrue(PasswordHistory.validate_password_reuse(staff, "test"))

        self.assertFalse(PasswordHistory.should_user_reset_password_now(user))
        self.assertFalse(PasswordHistory.should_user_reset_password_now(staff))

    @patch.dict("django.conf.settings.ADVANCED_SECURITY_CONFIG", {'MIN_DIFFERENT_STAFF_PASSWORDS_BEFORE_REUSE': 2})
    @patch.dict("django.conf.settings.ADVANCED_SECURITY_CONFIG", {'MIN_DIFFERENT_STUDENT_PASSWORDS_BEFORE_REUSE': 1})
    def test_accounts_password_reuse(self):
        """
        Assert against the password reuse policy
        """
        user = self._user_factory_with_history()
        staff = self._user_factory_with_history(is_staff=True)

        # students need to user at least one different passwords before reuse
        self.assertFalse(PasswordHistory.validate_password_reuse(user, "test"))
        self.assertTrue(PasswordHistory.validate_password_reuse(user, "different"))
        self._change_password(user, "different")

        self.assertTrue(PasswordHistory.validate_password_reuse(user, "test"))

        # staff needs to use at least two different passwords before reuse
        self.assertFalse(PasswordHistory.validate_password_reuse(staff, "test"))
        self.assertTrue(PasswordHistory.validate_password_reuse(staff, "different"))
        self._change_password(staff, "different")

        self.assertFalse(PasswordHistory.validate_password_reuse(staff, "test"))
        self.assertFalse(PasswordHistory.validate_password_reuse(staff, "different"))
        self.assertTrue(PasswordHistory.validate_password_reuse(staff, "third"))
        self._change_password(staff, "third")

        self.assertTrue(PasswordHistory.validate_password_reuse(staff, "test"))

    @patch.dict("django.conf.settings.ADVANCED_SECURITY_CONFIG", {'MIN_DAYS_FOR_STAFF_ACCOUNTS_PASSWORD_RESETS': 1})
    @patch.dict("django.conf.settings.ADVANCED_SECURITY_CONFIG", {'MIN_DAYS_FOR_STUDENT_ACCOUNTS_PASSWORD_RESETS': 5})
    def test_forced_password_change(self):
        """
        Assert when passwords must be reset
        """
        student = self._user_factory_with_history()
        staff = self._user_factory_with_history(is_staff=True)

        # also create a user who doesn't have any history
        grandfathered_student = UserFactory()
        grandfathered_student.date_joined = timezone.now()
        grandfathered_student.save()

        self.assertFalse(PasswordHistory.should_user_reset_password_now(student))
        self.assertFalse(PasswordHistory.should_user_reset_password_now(staff))
        self.assertFalse(PasswordHistory.should_user_reset_password_now(grandfathered_student))

        staff_reset_time = timezone.now() + timedelta(days=1)
        with freeze_time(staff_reset_time):
            self.assertFalse(PasswordHistory.should_user_reset_password_now(student))
            self.assertFalse(PasswordHistory.should_user_reset_password_now(grandfathered_student))
            self.assertTrue(PasswordHistory.should_user_reset_password_now(staff))

            self._change_password(staff,'Different')
            self.assertFalse(PasswordHistory.should_user_reset_password_now(staff))

        student_reset_time = timezone.now() + timedelta(days=5)

        with freeze_time(student_reset_time):
            self.assertTrue(PasswordHistory.should_user_reset_password_now(student))
            self.assertTrue(PasswordHistory.should_user_reset_password_now(grandfathered_student))
            self.assertTrue(PasswordHistory.should_user_reset_password_now(staff))

            self._change_password(student,'Different')
            self.assertFalse(PasswordHistory.should_user_reset_password_now(student))

            self._change_password(grandfathered_student,'Different')
            self.assertFalse(PasswordHistory.should_user_reset_password_now(grandfathered_student))

            self._change_password(staff,'Different')
            self.assertFalse(PasswordHistory.should_user_reset_password_now(staff))

    @patch.dict("django.conf.settings.ADVANCED_SECURITY_CONFIG", {'MIN_DAYS_FOR_STAFF_ACCOUNTS_PASSWORD_RESETS': None})
    @patch.dict("django.conf.settings.ADVANCED_SECURITY_CONFIG", {'MIN_DAYS_FOR_STUDENT_ACCOUNTS_PASSWORD_RESETS': None})
    def test_no_forced_password_change(self):
        """
        Assert that if we skip configuration, then user will never have to force reset password
        """
        student = self._user_factory_with_history()
        staff = self._user_factory_with_history(is_staff=True)

        # also create a user who doesn't have any history
        grandfathered_student = UserFactory()
        grandfathered_student.date_joined = timezone.now()
        grandfathered_student.save()

        self.assertFalse(PasswordHistory.should_user_reset_password_now(student))
        self.assertFalse(PasswordHistory.should_user_reset_password_now(staff))
        self.assertFalse(PasswordHistory.should_user_reset_password_now(grandfathered_student))

        staff_reset_time = timezone.now() + timedelta(days=100)
        with freeze_time(staff_reset_time):
            self.assertFalse(PasswordHistory.should_user_reset_password_now(student))
            self.assertFalse(PasswordHistory.should_user_reset_password_now(grandfathered_student))
            self.assertFalse(PasswordHistory.should_user_reset_password_now(staff))

    @patch.dict("django.conf.settings.ADVANCED_SECURITY_CONFIG", {'MIN_TIME_IN_DAYS_BETWEEN_ALLOWED_RESETS': 1})
    def test_too_frequent_password_resets(self):
        """
        Assert that a user should not be able to password reset too frequently
        """
        student = self._user_factory_with_history()

        self.assertFalse(PasswordHistory.validate_password_reset_frequency(student))

        staff_reset_time = timezone.now() + timedelta(days=100)
        with freeze_time(staff_reset_time):
            self.assertTrue(PasswordHistory.validate_password_reset_frequency(student))

    @patch.dict("django.conf.settings.ADVANCED_SECURITY_CONFIG", {'MIN_TIME_IN_DAYS_BETWEEN_ALLOWED_RESETS': None})
    def test_disabled_too_frequent_password_resets(self):
        """
        Verify properly default behavior when feature is disabled
        """
        student = self._user_factory_with_history()

        self.assertTrue(PasswordHistory.validate_password_reset_frequency(student))
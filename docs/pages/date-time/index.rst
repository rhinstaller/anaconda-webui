.. This page is included from docs/installation-steps.rst.

Date and time
-------------

The Date and time screen allows you to configure time and date-related settings for your system. This screen is automatically configured based on the settings you selected on the Welcome screen, but you can change your date, time and timezone before you begin the installation.

**Date and time**

Use **Automatically set date and time, using time servers** to enable or disable network time synchronization (NTP). When enabled, the system time is kept correct as long as the system can access the internet. Use **Configure NTP servers** to specify or change the NTP servers used for synchronization. When automatic date and time is disabled, you can set the date and time manually using the date and time fields. The **Show AM/PM** toggle switches between 12-hour and 24-hour time display.

**Timezone**

Use **Automatically set timezone** to have the timezone detected automatically, or clear it to choose manually. In the timezone section, select your **region** (for example, Europe) and then your **city** or the city closest to you in the same time zone. The screen shows the resulting offset (e.g. GMT+2, UTC+2). Selecting a specific location helps ensure that your time is set correctly, including daylight saving time if applicable. To use a time zone relative to Greenwich Mean Time (GMT) without a specific region, select ``Etc`` as your region.

.. note::
   The list of cities and regions comes from the Time Zone Database (tzdata), maintained by the Internet Assigned Numbers Authority (IANA). See the `IANA time zone database <https://www.iana.org/time-zones>`_ for more information.

After configuring your time and date settings, confirm to proceed to the next step.

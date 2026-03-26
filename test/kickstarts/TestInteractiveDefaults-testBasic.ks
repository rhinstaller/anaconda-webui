bootloader --timeout=1
zerombr
clearpart --all
part biosboot --fstype=biosboot --size=1
part /boot --fstype=xfs --size=1024
part swap --size=1024
part / --fstype=xfs --grow
part /home --fstype=xfs --size=2048

rootpw testcase
user --name=alice --gecos="Alice Admin" --groups=wheel
user --name=bob --gecos="Bob User"
user --name=carol --gecos="Carol Dev" --groups=wheel,adm

timezone --utc Europe/Prague
timesource --ntp-server ntp.cesnet.cz
timesource --ntp-server nts-test.strangled.net --nts
timesource --ntp-pool 0.pool.ntp.org

bootloader --timeout=1
zerombr
clearpart --all
part /boot/efi --fstype=efi --size=500  # EFI_PARTITION_KICKSTART_SIZE_MB
part /boot --fstype=xfs --size=1100
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

%packages
@^workstation-product-environment
@domain-client
%end

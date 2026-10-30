lang en

# FTP can not be (for now) expressed by the installation source step, so the step is
# hidden and the source is only shown on the review screen. The credentials
# check that the password is masked there.
url --url="ftp://tester:password@ftp.example.com/fedora/linux/releases/43/Everything/x86_64/os/"

bootloader --timeout=1
zerombr
clearpart --all
part /boot/efi --fstype=efi --size=500
part /boot --fstype=xfs --size=1100
part swap --size=1024
part / --fstype=xfs --grow

rootpw testcase

timezone --utc Europe/Prague

%packages
@^server-product-environment
%end

bootloader --timeout=1
zerombr
clearpart --all
autopart

rootpw testcase

timezone --utc Europe/Prague

%packages
@^workstation-product-environment
%end

%pre-install --erroronfail
echo "This is a fatal error" >&2
exit 1
%end

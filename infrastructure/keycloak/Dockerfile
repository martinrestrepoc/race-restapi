ARG KEYCLOAK_VERSION=26.7.0

FROM quay.io/keycloak/keycloak:${KEYCLOAK_VERSION} AS builder

ENV KC_DB=postgres
ENV KC_HEALTH_ENABLED=true
ENV KC_METRICS_ENABLED=true

WORKDIR /opt/keycloak
RUN /opt/keycloak/bin/kc.sh build

FROM quay.io/keycloak/keycloak:${KEYCLOAK_VERSION}

ENV KC_DB=postgres
ENV KC_HEALTH_ENABLED=true
ENV KC_METRICS_ENABLED=true

COPY --from=builder /opt/keycloak/ /opt/keycloak/
COPY themes/race-management/ /opt/keycloak/themes/race-management/

# A missing theme must fail the immutable image build instead of breaking login
# at runtime. Its parent remains Keycloak's maintained v2 theme as safe fallback.
RUN test -f /opt/keycloak/themes/race-management/login/theme.properties \
    && test -f /opt/keycloak/themes/race-management/login/resources/css/login.css \
    && test -f /opt/keycloak/themes/race-management/login/resources/img/racing-mark.svg

ENTRYPOINT ["/opt/keycloak/bin/kc.sh"]

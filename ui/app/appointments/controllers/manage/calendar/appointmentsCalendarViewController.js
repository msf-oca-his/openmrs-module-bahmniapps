'use strict';

angular.module('bahmni.appointments')
    .controller('AppointmentsCalendarViewController', ['$scope', '$state', '$translate', 'spinner', 'appointmentsService', 'appointmentsContext', 'appointmentsFilter',
        function ($scope, $state, $translate, spinner, appointmentsService, appointmentsContext, appointmentsFilter) {
            $scope.allAppointmentsForDay = appointmentsContext.appointments;
            var init = function () {
                $scope.startDate = $state.params.viewDate || moment().startOf('day').toDate();
                $scope.isFilterOpen = $state.params.isFilterOpen;
                var parseAppointments = function (allAppointments) {
                    var appointments = allAppointments.filter(function (appointment) {
                        return appointment.status !== $translate.instant("APPOINTMENT_CANCELLED_STATUS");
                    });
                    var resources = _.chain(appointments)
                        .filter(function (appointment) {
                            return !_.isEmpty(appointment.provider);
                        }).map(function (appointment) {
                            return appointment.provider;
                        }).uniqBy('name')
                        .map(function (provider) {
                            return {id: provider.name, title: provider.name, provider: provider};
                        }).sortBy('id')
                        .value();

                    var hasAppointmentsWithNoProvidersSpecified = _.find(appointments, function (appointment) {
                        return _.isEmpty(appointment.provider);
                    });

                    if (hasAppointmentsWithNoProvidersSpecified) {
                        resources.push({
                            id: $translate.instant("NO_PROVIDER_COLUMN_KEY"),
                            title: $translate.instant("NO_PROVIDER_COLUMN_KEY"),
                            provider: {name: $translate.instant("NO_PROVIDER_COLUMN_KEY"), display: $translate.instant("NO_PROVIDER_COLUMN_KEY"), uuid: 'no-provider-uuid'}
                        });
                    }

                    var events = [];
                    appointments.reduce(function (result, appointment) {
                        var event = {};
                        event.resourceId = appointment.provider ? appointment.provider.name : $translate.instant("NO_PROVIDER_COLUMN_KEY");
                        event.start = appointment.startDateTime;
                        event.end = appointment.endDateTime;
                        event.color = appointment.service.color;
                        event.serviceName = appointment.service.name;
                        var existingEvent = _.find(result, event);
                        var patientName = appointment.patient.name + "(" + appointment.patient.identifier + ")";
                        if (existingEvent) {
                            existingEvent.title = [existingEvent.title, patientName].join(', ');
                            existingEvent.appointments.push(appointment);
                        } else {
                            event.title = patientName;
                            event.appointments = [];
                            event.appointments.push(appointment);
                            result.push(event);
                        }
                        return result;
                    }, events);

                    $scope.providerAppointments = {resources: resources, events: events};
                    $scope.shouldReload = true;
                };
                parseAppointments(appointmentsContext.appointments);

                $scope.getAppointmentsForDate = function (viewDate) {
                    $state.params.viewDate = viewDate;
                    $scope.shouldReload = false;
                    var params = {forDate: viewDate};
                    return spinner.forPromise(appointmentsService.getAllAppointments(params).then(function (response) {
                        $scope.allAppointmentsForDay = response.data;
                        var filteredAppointments = appointmentsFilter($scope.allAppointmentsForDay, $state.params.filterParams);
                        return parseAppointments(filteredAppointments);
                    }));
                };

                $scope.$watch(function () {
                    return $state.params.filterParams;
                }, function (newValue, oldValue) {
                    if (newValue !== oldValue) {
                        var filteredAppointments = appointmentsFilter($scope.allAppointmentsForDay, $state.params.filterParams);
                        parseAppointments(filteredAppointments);
                    }
                }, true);
            };

            $scope.hasNoAppointments = function () {
                return _.isEmpty($scope.providerAppointments.events);
            };
            return init();
        }]);
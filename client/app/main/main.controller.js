'use strict';

(function() {

class MainController {

  constructor($scope, $log, Timesheet, Projects, $state, $stateParams, $rootScope, $timeout, $q) {


    // Refreshed cached content
    Timesheet.getTimesheets({force: true});

    Projects.getProjects()
      .then(projects => {
        this.projects = projects;
      });

    const getTimesheets = () => {

      let timesheetPromise = [ Timesheet.getTimesheets() ];
      if($state.params && $state.params.id && $state.params.id.trim()){
        timesheetPromise.push(Timesheet.getTimesheet($state.params.id));
      }

      return Promise.all(timesheetPromise)
        .then(([timesheets, timesheet]) => {

          //$log.debug('currentState', $state, $state.params);
          $log.debug('timesheets', timesheets);
          this.timesheets = timesheets;

          if(timesheet){
            return [timesheets, timesheet];
          }
          if ($state.params.id) {
            return $q.all([$q.resolve(timesheets), Timesheet.getTimesheet($state.params.id)]);
          }
          else {
            return $q.all([$q.resolve(timesheets), Timesheet.getFirstTimesheet(timesheets)]);
          }

        })
        .then(([timesheets, currentTimesheet]) => {

          $log.debug('currentTimesheet', $state.params, currentTimesheet);

          if (! $state.params.id || ! $state.params.id.trim()) {
            return $state.go('main.timesheet', {id: currentTimesheet.id}, {replace: true});
          }
          else if (currentTimesheet.id === $state.params.id) {

            this.currentTimesheet = currentTimesheet;
            $timeout(() => {
              this.loadingCurrentTimesheet = false;
            });

            try {

              //Preload next timesheet
              let index = _(timesheets).map((timesheet, index) => {
                if(timesheet.id === currentTimesheet.id){
                  return index + 1;
                }
              }).filter().first();

              if(index < timesheets.length){
                $log.debug('Preloading next timesheet', index);
                return Timesheet.getTimesheet(timesheets && timesheets[index] && timesheets[index].id);
              }
            }
            catch(err){$log.error(err);}

          }
        })
        .catch(err => {
          if(err.status === 404){

            //TODO handle better -> go directly to next timesheet
            return $state.go($state.current.name, {id: ''}, {reload: true});
          }
        });
    };


    $scope.$on('$destroy', $rootScope.$on('$stateChangeSuccess', () => {
      this.currentTimesheet = undefined;
      $timeout(() => {
        getTimesheets();
        $timeout(()=> {
          this.loadingCurrentTimesheet = true;
        });
      });
    }));
    this.loadingCurrentTimesheet = true;
    $timeout(getTimesheets);

  }

}

angular.module('stayApp')
  .controller('MainController', MainController);

})();

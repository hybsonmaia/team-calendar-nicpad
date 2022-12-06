sap.ui.define(
  [
    'sap/ui/core/mvc/Controller',
    'sap/ui/core/Fragment',
    'sap/ui/core/Item',
    'sap/m/MessageToast',
    'model/formatter',
    'sap/ui/core/Core',
    'sap/m/Label',
    'sap/m/Popover',
    'sap/ui/core/library',
    'sap/ui/core/format/DateFormat',
    'sap/ui/model/json/JSONModel',
    'sap/base/Log'
  ],
  function (
    Controller,
    Fragment,
    Item,
    MessageToast,
    formatter,
    oCore,
    Label,
    Popover,
    coreLibrary,
    DateFormat,
    JSONModel,
    Log
  ) {
    'use strict'

    var ValueState = coreLibrary.ValueState

    return Controller.extend('teamCalendar.controller.Main', {
      myformatter: formatter,
      imagePath: sap.ui.require
        .toUrl('sap/m/demokit/teamCalendar/webapp/')
        .replace('/resources/', '/test-resources/'),

      // Initial setup
      onInit: function () {
        this._oModel = this.getView().getModel('calendar')
        this._oStartDate = this.myformatter.utcToLocalDateTime(
          this._oModel.getProperty('/startDate')
        )
        this._sSelectedView = this._oModel.getProperty('/viewKey')
        this._sSelectedMember = 'Team'
        this._oCalendarContainer = this.byId('mainContent')
        this._mCalendars = {}
        this._sCalendarDisplayed = ''

        // load and display the Planning Calendar
        this._loadCalendar('PlanningCalendar')
      },

      // Does loading of the PC/SPC depending on selected item
      selectChangeHandler: function (oEvent) {
        this._sSelectedMember = oEvent.getParameter('selectedItem').getKey()
        this._loadCalendar(
          isNaN(this._sSelectedMember)
            ? 'PlanningCalendar'
            : 'SinglePlanningCalendar'
        )
      },

      // Loads SPC for a person which row is clicked
      rowSelectionHandler: function (oEvent) {
        var oSelectedRow = oEvent.getParameter('rows')[0],
          sSelectedId = oSelectedRow.getId()
        this._sSelectedMember = sSelectedId.substr(
          sSelectedId.lastIndexOf('-') + 1
        )
        oSelectedRow.setSelected(false)
        this._loadCalendar('SinglePlanningCalendar')
      },

      // Saves currently selected date
      startDateChangeHandler: function (oEvent) {
        this._oStartDate = new Date(oEvent.getSource().getStartDate())
      },

      // Saves currently selected view
      viewChangeHandler: function (oEvent) {
        var oCalendar = oEvent.getSource()
        if (isNaN(this._sSelectedMember)) {
          this._sSelectedView = oCalendar.getViewKey()
        } else {
          this._sSelectedView = oCore.byId(oCalendar.getSelectedView()).getKey()
        }
        oCalendar.setStartDate(this._oStartDate)
      },

      _aDialogTypes: [
        { title: 'Criar Tarefa', type: 'create_appointment' },
        {
          title: 'Criar Tarefa',
          type: 'create_appointment_with_context'
        },
        { title: 'Editar Tarefa', type: 'edit_appointment' }
      ],

      handleAppointmentSelect: function (oEvent) {
        var oAppointment = oEvent.getParameter('appointment')

        if (oAppointment) {
          this._handleSingleAppointment(oAppointment)
        } else {
          this._handleGroupAppointments(oEvent)
        }
      },

      _addNewAppointment: function (oAppointment) {
        var oModel = this.getView().getModel(),
          sPath =
            '/people/' +
            this.byId('selectPerson').getSelectedIndex().toString(),
          oPersonAppointments

        if (this.byId('isIntervalAppointment').getSelected()) {
          sPath += '/headers'
        } else {
          sPath += '/appointments'
        }

        oPersonAppointments = oModel.getProperty(sPath)

        oPersonAppointments.push(oAppointment)

        oModel.setProperty(sPath, oPersonAppointments)
      },

      handleCancelButton: function () {
        this.byId('detailsPopover').close()
      },

      // Handler of the "Create" button (oEvent)
      appointmentCreate: function () {
        // MessageToast.show('Criando novo compromisso...')
        this._arrangeDialogFragment(this._aDialogTypes[0].type)
      },

      handleAppointmentAddWithContext: function (oEvent) {
        this.oClickEventParameters = oEvent.getParameters()
        this._arrangeDialogFragment(this._aDialogTypes[1].type)
      },

      _validateDateTimePicker: function (
        oDateTimePickerStart,
        oDateTimePickerEnd
      ) {
        var oStartDate = oDateTimePickerStart.getDateValue(),
          oEndDate = oDateTimePickerEnd.getDateValue(),
          sValueStateText = 'Start date should be before End date'

        if (
          oStartDate &&
          oEndDate &&
          oEndDate.getTime() <= oStartDate.getTime()
        ) {
          oDateTimePickerStart.setValueState(ValueState.Error)
          oDateTimePickerEnd.setValueState(ValueState.Error)
          oDateTimePickerStart.setValueStateText(sValueStateText)
          oDateTimePickerEnd.setValueStateText(sValueStateText)
        } else {
          oDateTimePickerStart.setValueState(ValueState.None)
          oDateTimePickerEnd.setValueState(ValueState.None)
        }
      },

      updateButtonEnabledState: function (oDialog) {
        var oStartDate = this.byId('startDate'),
          oEndDate = this.byId('endDate'),
          bEnabled =
            oStartDate.getValueState() !== ValueState.Error &&
            oStartDate.getValue() !== '' &&
            oEndDate.getValue() !== '' &&
            oEndDate.getValueState() !== ValueState.Error

        oDialog.getBeginButton().setEnabled(bEnabled)
      },

      handleCreateChange: function (oEvent) {
        var oDateTimePickerStart = this.byId('startDate'),
          oDateTimePickerEnd = this.byId('endDate')

        if (oEvent.getParameter('valid')) {
          this._validateDateTimePicker(oDateTimePickerStart, oDateTimePickerEnd)
        } else {
          oEvent.getSource().setValueState(ValueState.Error)
        }

        this.updateButtonEnabledState(this.byId('createDialog'))
      },

      _removeAppointment: function (oAppointment, sPersonId) {
        var oModel = this.getView().getModel(),
          sTempPath,
          aPersonAppointments,
          iIndexForRemoval

        if (!sPersonId) {
          sTempPath = this.sPath.slice(
            0,
            this.sPath.indexOf('appointments/') + 'appointments/'.length
          )
        } else {
          sTempPath = '/people/' + sPersonId + '/appointments'
        }

        aPersonAppointments = oModel.getProperty(sTempPath)
        iIndexForRemoval = aPersonAppointments.indexOf(oAppointment)

        if (iIndexForRemoval !== -1) {
          aPersonAppointments.splice(iIndexForRemoval, 1)
        }

        oModel.setProperty(sTempPath, aPersonAppointments)
      },

      handleDeleteAppointment: function () {
        var oDetailsPopover = this.byId('detailsPopover'),
          oBindingContext = oDetailsPopover.getBindingContext(),
          oAppointment = oBindingContext.getObject(),
          iPersonIdStartIndex =
            oBindingContext.getPath().indexOf('/people/') + '/people/'.length,
          iPersonId = oBindingContext.getPath()[iPersonIdStartIndex]

        this._removeAppointment(oAppointment, iPersonId)
        oDetailsPopover.close()
      },

      handleEditButton: function () {
        var oDetailsPopover = this.byId('detailsPopover')
        this.sPath = oDetailsPopover.getBindingContext().getPath()
        oDetailsPopover.close()
        this._arrangeDialogFragment(this._aDialogTypes[2].type)
      },

      _arrangeDialogFragment: function (iDialogType) {
        var oView = this.getView()

        if (!this._pNewAppointmentDialog) {
          this._pNewAppointmentDialog = Fragment.load({
            id: oView.getId(),
            name: 'teamCalendar.view.Create',
            controller: this
          }).then(function (oDialog) {
            oView.addDependent(oDialog)
            return oDialog
          })
        }
        this._pNewAppointmentDialog.then(
          function (oDialog) {
            this._arrangeDialog(iDialogType, oDialog)
          }.bind(this)
        )
      },

      _arrangeDialog: function (sDialogType, oDialog) {
        var sTempTitle = ''
        oDialog._sDialogType = sDialogType
        if (sDialogType === 'edit_appointment') {
          this._setEditAppointmentDialogContent(oDialog)
          sTempTitle = this._aDialogTypes[2].title
        } else if (sDialogType === 'create_appointment_with_context') {
          this._setCreateWithContextAppointmentDialogContent()
          sTempTitle = this._aDialogTypes[1].title
        } else if (sDialogType === 'create_appointment') {
          this._setCreateAppointmentDialogContent()
          sTempTitle = this._aDialogTypes[0].title
        } else {
          Log.error('Wrong dialog type.')
        }

        this.updateButtonEnabledState(oDialog)
        oDialog.setTitle(sTempTitle)
        oDialog.open()
      },

      handleAppointmentTypeChange: function (oEvent) {
        var oAppointmentType = this.byId('isIntervalAppointment')

        oAppointmentType.setSelected(oEvent.getSource().getSelected())
      },

      handleDialogCancelButton: function () {
        this.byId('createDialog').close()
      },

      _editAppointment: function (
        oAppointment,
        bIsIntervalAppointment,
        iPersonId,
        oNewAppointmentDialog
      ) {
        var sAppointmentPath = this._appointmentOwnerChange(
            oNewAppointmentDialog
          ),
          oModel = this.getView().getModel()

        if (bIsIntervalAppointment) {
          this._convertToHeader(oAppointment, oNewAppointmentDialog)
        } else {
          if (this.sPath !== sAppointmentPath) {
            this._addNewAppointment(
              oNewAppointmentDialog.getModel().getProperty(this.sPath)
            )
            this._removeAppointment(
              oNewAppointmentDialog.getModel().getProperty(this.sPath)
            )
          }
          oModel.setProperty(sAppointmentPath + '/title', oAppointment.title)
          oModel.setProperty(sAppointmentPath + '/info', oAppointment.info)
          oModel.setProperty(sAppointmentPath + '/type', oAppointment.type)
          oModel.setProperty(sAppointmentPath + '/start', oAppointment.start)
          oModel.setProperty(sAppointmentPath + '/end', oAppointment.end)
        }
      },

      _convertToHeader: function (oAppointment, oNewAppointmentDialog) {
        var sPersonId = this.byId('selectPerson').getSelectedIndex().toString()

        this._removeAppointment(
          oNewAppointmentDialog.getModel().getProperty(this.sPath),
          sPersonId
        )
        this._addNewAppointment({
          start: oAppointment.start,
          end: oAppointment.end,
          title: oAppointment.title,
          type: oAppointment.type
        })
      },

      handleDialogSaveButton: function () {
        var oStartDate = this.byId('startDate'),
          oEndDate = this.byId('endDate'),
          sInfoValue = this.byId('moreInfo').getValue(),
          sInputTitle = this.byId('inputTitle').getValue(),
          iPersonId = this.byId('selectPerson').getSelectedIndex(),
          oModel = this.getView().getModel(),
          bIsIntervalAppointment = this.byId(
            'isIntervalAppointment'
          ).getSelected(),
          oNewAppointmentDialog = this.byId('createDialog'),
          oNewAppointment

        if (
          oStartDate.getValueState() !== ValueState.Error &&
          oEndDate.getValueState() !== ValueState.Error
        ) {
          if (
            this.sPath &&
            oNewAppointmentDialog._sDialogType === 'edit_appointment'
          ) {
            this._editAppointment(
              {
                title: sInputTitle,
                info: sInfoValue,
                type: this.byId('detailsPopover')
                  .getBindingContext()
                  .getObject().type,
                start: oStartDate.getDateValue(),
                end: oEndDate.getDateValue()
              },
              bIsIntervalAppointment,
              iPersonId,
              oNewAppointmentDialog
            )
          } else {
            if (bIsIntervalAppointment) {
              oNewAppointment = {
                title: sInputTitle,
                start: oStartDate.getDateValue(),
                end: oEndDate.getDateValue()
              }
            } else {
              oNewAppointment = {
                title: sInputTitle,
                info: sInfoValue,
                start: oStartDate.getDateValue(),
                end: oEndDate.getDateValue()
              }
            }
            this._addNewAppointment(oNewAppointment)
          }

          oModel.updateBindings()

          oNewAppointmentDialog.close()
        }
      },

      _appointmentOwnerChange: function (oNewAppointmentDialog) {
        var iSpathPersonId =
            this.sPath[this.sPath.indexOf('/people/') + '/people/'.length],
          iSelectedPerson = this.byId('selectPerson').getSelectedIndex(),
          sTempPath = this.sPath,
          iLastElementIndex = oNewAppointmentDialog
            .getModel()
            .getProperty(
              '/people/' + iSelectedPerson.toString() + '/appointments/'
            )
            .length.toString()

        if (iSpathPersonId !== iSelectedPerson.toString()) {
          sTempPath = ''.concat(
            '/people/',
            iSelectedPerson.toString(),
            '/appointments/',
            iLastElementIndex.toString()
          )
        }

        return sTempPath
      },

      _setCreateAppointmentDialogContent: function () {
        var oAppointmentType = this.byId('isIntervalAppointment'),
          oDateTimePickerStart = this.byId('startDate'),
          oDateTimePickerEnd = this.byId('endDate'),
          oTitleInput = this.byId('inputTitle'),
          oMoreInfoInput = this.byId('moreInfo'),
          oPersonSelected = this.byId('selectPerson')

        //Set the person in the first row as selected.
        oPersonSelected.setSelectedItem(this.byId('selectPerson').getItems()[0])
        oDateTimePickerStart.setValue('')
        oDateTimePickerEnd.setValue('')
        oDateTimePickerStart.setValueState(ValueState.None)
        oDateTimePickerEnd.setValueState(ValueState.None)
        oTitleInput.setValue('')
        oMoreInfoInput.setValue('')
        oAppointmentType.setSelected(false)
      },

      _setCreateWithContextAppointmentDialogContent: function () {
        var aPeople = this.getView().getModel().getProperty('/people/'),
          oSelectedIntervalStart = this.oClickEventParameters.startDate,
          oStartDate = this.byId('startDate'),
          oSelectedIntervalEnd = this.oClickEventParameters.endDate,
          oEndDate = this.byId('endDate'),
          oDateTimePickerStart = this.byId('startDate'),
          oDateTimePickerEnd = this.byId('endDate'),
          oAppointmentType = this.byId('isIntervalAppointment'),
          oTitleInput = this.byId('inputTitle'),
          oMoreInfoInput = this.byId('moreInfo'),
          sPersonName,
          oPersonSelected

        if (this.oClickEventParameters.row) {
          sPersonName = this.oClickEventParameters.row.getTitle()
          oPersonSelected = this.byId('selectPerson')

          oPersonSelected.setSelectedIndex(
            aPeople.indexOf(
              aPeople.filter(function (oPerson) {
                return oPerson.name === sPersonName
              })[0]
            )
          )
        }

        oStartDate.setDateValue(oSelectedIntervalStart)

        oEndDate.setDateValue(oSelectedIntervalEnd)

        oTitleInput.setValue('')

        oMoreInfoInput.setValue('')

        oAppointmentType.setSelected(false)

        oDateTimePickerStart.setValueState(ValueState.None)
        oDateTimePickerEnd.setValueState(ValueState.None)

        delete this.oClickEventParameters
      },

      _setEditAppointmentDialogContent: function (oDialog) {
        var oAppointment = oDialog.getModel().getProperty(this.sPath),
          oSelectedIntervalStart = oAppointment.start,
          oSelectedIntervalEnd = oAppointment.end,
          oDateTimePickerStart = this.byId('startDate'),
          oDateTimePickerEnd = this.byId('endDate'),
          sSelectedInfo = oAppointment.info,
          sSelectedTitle = oAppointment.title,
          iSelectedPersonId =
            this.sPath[this.sPath.indexOf('/people/') + '/people/'.length],
          oPersonSelected = this.byId('selectPerson'),
          oStartDate = this.byId('startDate'),
          oEndDate = this.byId('endDate'),
          oMoreInfoInput = this.byId('moreInfo'),
          oTitleInput = this.byId('inputTitle'),
          oAppointmentType = this.byId('isIntervalAppointment')

        oPersonSelected.setSelectedIndex(iSelectedPersonId)

        oStartDate.setDateValue(oSelectedIntervalStart)

        oEndDate.setDateValue(oSelectedIntervalEnd)

        oMoreInfoInput.setValue(sSelectedInfo)

        oTitleInput.setValue(sSelectedTitle)

        oDateTimePickerStart.setValueState(ValueState.None)
        oDateTimePickerEnd.setValueState(ValueState.None)

        oAppointmentType.setSelected(false)
      },

      _handleSingleAppointment: function (oAppointment) {
        var oView = this.getView()
        if (oAppointment === undefined) {
          return
        }

        if (!oAppointment.getSelected() && this._pDetailsPopover) {
          this._pDetailsPopover.then(function (oDetailsPopover) {
            oDetailsPopover.close()
          })
          return
        }

        if (!this._pDetailsPopover) {
          this._pDetailsPopover = Fragment.load({
            id: oView.getId(),
            name: 'teamCalendar.view.Details',
            controller: this
          }).then(function (oDetailsPopover) {
            oView.addDependent(oDetailsPopover)
            return oDetailsPopover
          })
        }

        this._pDetailsPopover.then(
          function (oDetailsPopover) {
            this._setDetailsDialogContent(oAppointment, oDetailsPopover)
          }.bind(this)
        )
      },

      _setDetailsDialogContent: function (oAppointment, oDetailsPopover) {
        oDetailsPopover.setBindingContext(oAppointment.getBindingContext())
        oDetailsPopover.openBy(oAppointment)
      },

      formatDate: function (oDate) {
        if (oDate) {
          var iHours = oDate.getHours(),
            iMinutes = oDate.getMinutes(),
            iSeconds = oDate.getSeconds()

          if (iHours !== 0 || iMinutes !== 0 || iSeconds !== 0) {
            return DateFormat.getDateTimeInstance({ style: 'medium' }).format(
              oDate
            )
          } else {
            return DateFormat.getDateInstance({ style: 'medium' }).format(oDate)
          }
        }
      },

      _handleGroupAppointments: function (oEvent) {
        var aAppointments,
          sGroupAppointmentType,
          sGroupPopoverValue,
          sGroupAppDomRefId,
          bTypeDiffer

        aAppointments = oEvent.getParameter('appointments')
        sGroupAppointmentType = aAppointments[0].getType()
        sGroupAppDomRefId = oEvent.getParameter('domRefId')
        bTypeDiffer = aAppointments.some(function (oAppointment) {
          return sGroupAppointmentType !== oAppointment.getType()
        })

        if (bTypeDiffer) {
          sGroupPopoverValue =
            aAppointments.length + ' Appointments of different types selected'
        } else {
          sGroupPopoverValue =
            aAppointments.length +
            ' Appointments of the same ' +
            sGroupAppointmentType +
            ' selected'
        }

        if (!this._oGroupPopover) {
          this._oGroupPopover = new Popover({
            title: 'Group Appointments',
            content: new Label({
              text: sGroupPopoverValue
            })
          })
        } else {
          this._oGroupPopover.getContent()[0].setText(sGroupPopoverValue)
        }
        this._oGroupPopover.addStyleClass('sapUiContentPadding')
        this._oGroupPopover.openBy(document.getElementById(sGroupAppDomRefId))
      },

      // Opend a legend
      openLegend: function (oEvent) {
        var oSource = oEvent.getSource(),
          oView = this.getView()
        if (!this._pLegendPopover) {
          this._pLegendPopover = Fragment.load({
            id: oView.getId(),
            name: 'teamCalendar.view.Legend',
            controller: this
          }).then(function (oLegendPopover) {
            oView.addDependent(oLegendPopover)
            return oLegendPopover
          })
        }
        this._pLegendPopover.then(function (oLegendPopover) {
          if (oLegendPopover.isOpen()) {
            oLegendPopover.close()
          } else {
            oLegendPopover.openBy(oSource)
          }
        })
      },

      // Loads and displays calendar (if not already loaded), otherwise just displays it
      _loadCalendar: function (sCalendarId) {
        var oView = this.getView()

        if (!this._mCalendars[sCalendarId]) {
          this._mCalendars[sCalendarId] = Fragment.load({
            id: oView.getId(),
            name: 'teamCalendar.view.' + sCalendarId,
            controller: this
          }).then(
            function (oCalendarVBox) {
              this._populateSelect(this.byId(sCalendarId + 'TeamSelector'))
              return oCalendarVBox
            }.bind(this)
          )
        }

        this._mCalendars[sCalendarId].then(
          function (oCalendarVBox) {
            this._displayCalendar(sCalendarId, oCalendarVBox)
          }.bind(this)
        )
      },

      _hideCalendar: function () {
        if (this._sCalendarDisplayed === '') {
          return Promise.resolve()
        }
        return this._mCalendars[this._sCalendarDisplayed].then(
          function (oOldCalendarVBox) {
            this._oCalendarContainer.removeContent(oOldCalendarVBox)
          }.bind(this)
        )
      },

      // Displays already loaded calendar
      _displayCalendar: function (sCalendarId, oCalendarVBox) {
        this._hideCalendar().then(
          function () {
            this._oCalendarContainer.addContent(oCalendarVBox)
            this._sCalendarDisplayed = sCalendarId
            var oCalendar = oCalendarVBox.getItems()[0]
            var oTeamSelect = this.byId(sCalendarId + 'TeamSelector')
            oTeamSelect.setSelectedKey(this._sSelectedMember)
            oCalendar.setStartDate(this._oStartDate)
            if (isNaN(this._sSelectedMember)) {
              // Planning Calendar
              oCalendar.setViewKey(this._sSelectedView)
              oCalendar.bindElement({
                path: '/team',
                model: 'calendar'
              })
            } else {
              // Single Planning Calendar
              oCalendar.setSelectedView(
                oCalendar.getViewByKey(this._sSelectedView)
              )
              oCalendar.bindElement({
                path: '/team/' + this._sSelectedMember,
                model: 'calendar'
              })
            }
          }.bind(this)
        )
      },

      // Adds "Team" and all team members as select items
      _populateSelect: function (oSelect) {
        var iCount = this._oModel.getProperty('/team').length,
          iPerson
        for (iPerson = 0; iPerson < iCount; iPerson++) {
          oSelect.addItem(
            new Item({
              key: iPerson,
              text: this._oModel.getProperty('/team')[iPerson].name
            })
          )
        }
      }
    })
  }
)
